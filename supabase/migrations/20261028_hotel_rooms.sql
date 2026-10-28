-- Migration: Add hotel_rooms table for hotel business category
-- Enables room management, room-specific QR codes, and in-room food delivery

CREATE TABLE IF NOT EXISTS public.hotel_rooms (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  room_number TEXT NOT NULL,
  floor TEXT,
  room_type TEXT DEFAULT 'Standard',
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_hotel_room_number UNIQUE (business_id, room_number)
);

CREATE INDEX IF NOT EXISTS idx_hotel_rooms_business_id ON public.hotel_rooms(business_id);
CREATE INDEX IF NOT EXISTS idx_hotel_rooms_active ON public.hotel_rooms(business_id, is_active);
