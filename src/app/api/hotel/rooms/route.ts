import { NextRequest, NextResponse } from 'next/server';
import {
  getHotelRooms,
  getHotelRoomById,
  createHotelRoom,
  createHotelRoomsBatch,
  updateHotelRoom,
  deleteHotelRoom,
  getHotelRoomStats,
  getBusinessById,
} from '@/lib/db';
import { resolveBusinessByIdOrSlug } from '@/lib/slug';
import { getCurrentUserFromRequest, isUserAuthorizedForBusiness } from '@/lib/auth';

// GET /api/hotel/rooms?businessId=... OR ?slug=...
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const businessIdParam = searchParams.get('businessId');
    const slugParam = searchParams.get('slug');
    const activeOnly = searchParams.get('activeOnly') === 'true';

    let businessId = businessIdParam;
    if (!businessId && slugParam) {
      const resolved = await resolveBusinessByIdOrSlug(slugParam);
      if (resolved) {
        businessId = resolved.id;
      }
    }

    if (!businessId) {
      return NextResponse.json(
        { success: false, error: 'businessId or slug is required' },
        { status: 400 }
      );
    }

    const business = await getBusinessById(businessId);
    if (!business) {
      return NextResponse.json(
        { success: false, error: 'Business not found' },
        { status: 404 }
      );
    }

    const rooms = await getHotelRooms(businessId, activeOnly);
    const stats = await getHotelRoomStats(businessId);

    return NextResponse.json({
      success: true,
      businessId,
      rooms,
      stats,
    });
  } catch (error: any) {
    console.error('Error fetching hotel rooms:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch hotel rooms' },
      { status: 500 }
    );
  }
}

// POST /api/hotel/rooms
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUserFromRequest(req);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Please log in' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { businessId } = body;
    if (!businessId) {
      return NextResponse.json(
        { success: false, error: 'businessId is required' },
        { status: 400 }
      );
    }

    const isAuth = await isUserAuthorizedForBusiness(user, businessId);
    if (!isAuth) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: You do not have permission to manage rooms for this hotel' },
        { status: 403 }
      );
    }

    // 1. Bulk Range Generator e.g. start: 101, end: 110, floor: "1", roomType: "Deluxe"
    if (body.bulkRange) {
      const { start, end, prefix = '', floor, roomType, notes } = body.bulkRange;
      const startNum = parseInt(start, 10);
      const endNum = parseInt(end, 10);

      if (isNaN(startNum) || isNaN(endNum) || startNum > endNum) {
        return NextResponse.json(
          { success: false, error: 'Invalid room number range. Start number must be <= End number.' },
          { status: 400 }
        );
      }

      if (endNum - startNum > 100) {
        return NextResponse.json(
          { success: false, error: 'Maximum 100 rooms can be generated in a single batch.' },
          { status: 400 }
        );
      }

      const roomsToCreate = [];
      for (let i = startNum; i <= endNum; i++) {
        roomsToCreate.push({
          roomNumber: `${prefix}${i}`,
          floor: floor ? String(floor) : undefined,
          roomType: roomType ? String(roomType) : undefined,
          notes: notes ? String(notes) : undefined,
        });
      }

      const result = await createHotelRoomsBatch(businessId, roomsToCreate);
      return NextResponse.json({
        success: true,
        message: `Successfully created ${result.created.length} rooms${result.skipped.length > 0 ? ` (${result.skipped.length} existing rooms skipped)` : ''}`,
        created: result.created,
        skipped: result.skipped,
      });
    }

    // 2. Batch List of Rooms
    if (Array.isArray(body.rooms)) {
      const result = await createHotelRoomsBatch(businessId, body.rooms);
      return NextResponse.json({
        success: true,
        message: `Processed ${body.rooms.length} rooms: ${result.created.length} added, ${result.skipped.length} skipped`,
        created: result.created,
        skipped: result.skipped,
      });
    }

    // 3. Single Room Creation
    const { roomNumber, floor, roomType, isActive, notes } = body;
    if (!roomNumber || !String(roomNumber).trim()) {
      return NextResponse.json(
        { success: false, error: 'Room number is required' },
        { status: 400 }
      );
    }

    const room = await createHotelRoom({
      businessId,
      roomNumber: String(roomNumber).trim(),
      floor: floor ? String(floor).trim() : undefined,
      roomType: roomType ? String(roomType).trim() : undefined,
      isActive: isActive !== undefined ? Boolean(isActive) : true,
      notes: notes ? String(notes).trim() : undefined,
    });

    return NextResponse.json({
      success: true,
      message: `Room ${room.roomNumber} created successfully`,
      room,
    });
  } catch (error: any) {
    console.error('Error creating hotel room:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create room' },
      { status: 400 }
    );
  }
}

// PATCH /api/hotel/rooms
export async function PATCH(req: NextRequest) {
  try {
    const user = await getCurrentUserFromRequest(req);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Please log in' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Room ID is required' },
        { status: 400 }
      );
    }

    const existing = await getHotelRoomById(id);
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Room not found' },
        { status: 404 }
      );
    }

    const isAuth = await isUserAuthorizedForBusiness(user, existing.businessId);
    if (!isAuth) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: You do not have permission to modify this room' },
        { status: 403 }
      );
    }

    const updated = await updateHotelRoom(id, updates);
    return NextResponse.json({
      success: true,
      message: 'Room updated successfully',
      room: updated,
    });
  } catch (error: any) {
    console.error('Error updating hotel room:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update room' },
      { status: 400 }
    );
  }
}

// DELETE /api/hotel/rooms
export async function DELETE(req: NextRequest) {
  try {
    const user = await getCurrentUserFromRequest(req);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Please log in' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const businessId = searchParams.get('businessId');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Room ID is required' },
        { status: 400 }
      );
    }

    const existing = await getHotelRoomById(id);
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Room not found' },
        { status: 404 }
      );
    }

    const isAuth = await isUserAuthorizedForBusiness(user, existing.businessId);
    if (!isAuth) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: You do not have permission to delete this room' },
        { status: 403 }
      );
    }

    const deleted = await deleteHotelRoom(id, existing.businessId);
    return NextResponse.json({
      success: true,
      message: 'Room deleted successfully',
      deleted,
    });
  } catch (error: any) {
    console.error('Error deleting hotel room:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete room' },
      { status: 500 }
    );
  }
}
