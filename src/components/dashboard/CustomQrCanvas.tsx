'use client';

import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { QrCustomizationSettings, QrDotStyle, QrEyeStyle, QrFrameStyle } from '@/types';
import { isValidHexColor } from '@/lib/qrPresets';

interface CustomQrCanvasProps {
  targetUrl: string;
  customization: QrCustomizationSettings;
  businessName: string;
  businessLogo?: string;
  size?: number; // base render size (e.g. 520 for preview)
  className?: string;
  onGenerated?: (dataUrl: string, canvas: HTMLCanvasElement) => void;
}

export function CustomQrCanvas({
  targetUrl,
  customization,
  businessName,
  businessLogo,
  size = 520,
  className,
  onGenerated,
}: CustomQrCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [logoImg, setLogoImg] = useState<HTMLImageElement | null>(null);

  const activeLogoUrl = customization.customLogoUrl || businessLogo;

  // Pre-load logo image if enabled
  useEffect(() => {
    if (!customization.showLogo || !activeLogoUrl) {
      setLogoImg(null);
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = activeLogoUrl;
    img.onload = () => setLogoImg(img);
    img.onerror = () => {
      console.warn('Failed to load custom logo image, using monogram fallback');
      setLogoImg(null);
    };
  }, [customization.showLogo, activeLogoUrl]);

  // Main Canvas Rendering Engine
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !targetUrl) return;

    try {
      // 1. Generate QR module matrix with HIGH error correction ('H' = 30% recovery)
      const qr = QRCode.create(targetUrl, {
        errorCorrectionLevel: 'H',
      });
      const moduleCount = qr.modules.size;

      // 2. Determine frame layout and overall canvas dimensions
      const frameStyle = customization.frameStyle || 'none';
      const isCard = frameStyle === 'card';
      const isBottomBanner = frameStyle === 'bottom_banner';
      const isTopBanner = frameStyle === 'top_banner';
      const isBadge = frameStyle === 'badge';
      const isSimpleBorder = frameStyle === 'simple_border';

      // Internal QR code pixel size
      const qrSize = size;
      const margin = 28;

      let canvasW = qrSize + margin * 2;
      let canvasH = qrSize + margin * 2;
      let qrOffsetX = margin;
      let qrOffsetY = margin;

      if (isCard) {
        canvasW = qrSize + margin * 2 + 40;
        canvasH = qrSize + margin * 2 + 160;
        qrOffsetX = (canvasW - qrSize) / 2;
        qrOffsetY = 100;
      } else if (isBottomBanner) {
        canvasH = qrSize + margin * 2 + 84;
        qrOffsetY = margin + 10;
      } else if (isTopBanner) {
        canvasH = qrSize + margin * 2 + 84;
        qrOffsetY = margin + 74;
      } else if (isBadge) {
        canvasH = qrSize + margin * 2 + 70;
        qrOffsetY = margin + 10;
      } else if (isSimpleBorder) {
        canvasW = qrSize + margin * 2 + 20;
        canvasH = qrSize + margin * 2 + 20;
        qrOffsetX = (canvasW - qrSize) / 2;
        qrOffsetY = (canvasH - qrSize) / 2;
      }

      // Upscale for ultra-crisp high-DPI rendering
      const scale = 2;
      canvas.width = canvasW * scale;
      canvas.height = canvasH * scale;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.scale(scale, scale);

      // Helper: draw rounded rectangle
      const drawRoundRect = (
        x: number,
        y: number,
        width: number,
        height: number,
        radius: number,
        fillColor?: string,
        strokeColor?: string,
        lineWidth?: number
      ) => {
        ctx.beginPath();
        if (typeof ctx.roundRect === 'function') {
          ctx.roundRect(x, y, width, height, radius);
        } else {
          ctx.moveTo(x + radius, y);
          ctx.lineTo(x + width - radius, y);
          ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
          ctx.lineTo(x + width, y + height - radius);
          ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
          ctx.lineTo(x + radius, y + height);
          ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
          ctx.lineTo(x, y + radius);
          ctx.quadraticCurveTo(x, y, x + radius, y);
        }
        ctx.closePath();
        if (fillColor) {
          ctx.fillStyle = fillColor;
          ctx.fill();
        }
        if (strokeColor && lineWidth) {
          ctx.strokeStyle = strokeColor;
          ctx.lineWidth = lineWidth;
          ctx.stroke();
        }
      };

      // 3. Background Fill
      const bg = isValidHexColor(customization.backgroundColor) ? customization.backgroundColor : '#FFFFFF';
      const fg = isValidHexColor(customization.foregroundColor) ? customization.foregroundColor : '#4F46E5';
      const eyeColor = isValidHexColor(customization.eyeColor) ? customization.eyeColor : fg;
      const frameColor = isValidHexColor(customization.frameColor) ? customization.frameColor : fg;

      // Base Canvas Background
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, canvasW, canvasH);

      // If card style, draw outer card container with subtle shadow & border
      if (isCard) {
        ctx.fillStyle = bg;
        drawRoundRect(10, 10, canvasW - 20, canvasH - 20, 24, bg, '#E2E8F0', 2);

        // Header: Business Name & Subtext
        ctx.textAlign = 'center';
        ctx.fillStyle = fg;
        ctx.font = 'bold 22px system-ui, -apple-system, sans-serif';
        const displayBizName = businessName ? businessName.slice(0, 32) : 'Storefront';
        ctx.fillText(displayBizName, canvasW / 2, 50);

        ctx.fillStyle = '#64748B';
        ctx.font = '500 12px system-ui, -apple-system, sans-serif';
        ctx.fillText('Order Directly • Zero Registration Required', canvasW / 2, 74);
      } else if (isSimpleBorder) {
        drawRoundRect(10, 10, canvasW - 20, canvasH - 20, 20, undefined, frameColor, 3);
      }

      // 4. Calculate QR module positions
      const cellSize = qrSize / moduleCount;

      // Check if coordinate is inside one of the 3 Corner Finder Patterns (7x7 modules)
      const isFinder = (r: number, c: number) => {
        if (r < 7 && c < 7) return true; // Top-Left
        if (r < 7 && c >= moduleCount - 7) return true; // Top-Right
        if (r >= moduleCount - 7 && c < 7) return true; // Bottom-Left
        return false;
      };

      // Check if coordinate is in center logo exclusion zone (~22% area)
      const centerStart = Math.floor(moduleCount * 0.38);
      const centerEnd = Math.ceil(moduleCount * 0.62);
      const isCenter = (r: number, c: number) => {
        if (!customization.showLogo) return false;
        return r >= centerStart && r <= centerEnd && c >= centerStart && c <= centerEnd;
      };

      // 5. Draw QR Data Modules
      ctx.fillStyle = fg;
      const dotStyle: QrDotStyle = customization.dotStyle || 'rounded';

      for (let r = 0; r < moduleCount; r++) {
        for (let c = 0; c < moduleCount; c++) {
          if (isFinder(r, c) || isCenter(r, c)) continue;

          const isDark = qr.modules.get(r, c);
          if (!isDark) continue;

          const cellX = qrOffsetX + c * cellSize;
          const cellY = qrOffsetY + r * cellSize;

          if (dotStyle === 'square') {
            ctx.fillRect(cellX, cellY, cellSize, cellSize);
          } else if (dotStyle === 'rounded') {
            const pad = cellSize * 0.08;
            drawRoundRect(
              cellX + pad,
              cellY + pad,
              cellSize - pad * 2,
              cellSize - pad * 2,
              cellSize * 0.28,
              fg
            );
          } else if (dotStyle === 'dots') {
            ctx.beginPath();
            ctx.arc(
              cellX + cellSize / 2,
              cellY + cellSize / 2,
              (cellSize / 2) * 0.88,
              0,
              Math.PI * 2
            );
            ctx.fill();
          } else if (dotStyle === 'diamond') {
            ctx.beginPath();
            ctx.moveTo(cellX + cellSize / 2, cellY + cellSize * 0.08);
            ctx.lineTo(cellX + cellSize * 0.92, cellY + cellSize / 2);
            ctx.lineTo(cellX + cellSize / 2, cellY + cellSize * 0.92);
            ctx.lineTo(cellX + cellSize * 0.08, cellY + cellSize / 2);
            ctx.closePath();
            ctx.fill();
          } else if (dotStyle === 'classy') {
            // Connected flowing block
            const pad = cellSize * 0.06;
            drawRoundRect(
              cellX + pad,
              cellY + pad,
              cellSize - pad * 2,
              cellSize - pad * 2,
              cellSize * 0.45,
              fg
            );
          }
        }
      }

      // 6. Draw Custom Corner Eyes (3 Finder Patterns: Top-Left, Top-Right, Bottom-Left)
      const eyeStyle: QrEyeStyle = customization.eyeStyle || 'rounded';

      const drawEye = (originX: number, originY: number, style: QrEyeStyle) => {
        const outerSize = 7 * cellSize;
        const innerSize = 3 * cellSize;
        const innerOffset = 2 * cellSize;

        // Outer 7x7 Ring
        ctx.lineWidth = cellSize;
        ctx.strokeStyle = eyeColor;

        if (style === 'square') {
          ctx.strokeRect(
            originX + cellSize / 2,
            originY + cellSize / 2,
            outerSize - cellSize,
            outerSize - cellSize
          );
          ctx.fillStyle = eyeColor;
          ctx.fillRect(originX + innerOffset, originY + innerOffset, innerSize, innerSize);
        } else if (style === 'rounded') {
          drawRoundRect(
            originX + cellSize / 2,
            originY + cellSize / 2,
            outerSize - cellSize,
            outerSize - cellSize,
            cellSize * 1.5,
            undefined,
            eyeColor,
            cellSize
          );
          drawRoundRect(
            originX + innerOffset,
            originY + innerOffset,
            innerSize,
            innerSize,
            cellSize * 0.8,
            eyeColor
          );
        } else if (style === 'circle') {
          // Circular Outer Ring
          ctx.beginPath();
          ctx.arc(
            originX + outerSize / 2,
            originY + outerSize / 2,
            outerSize / 2 - cellSize / 2,
            0,
            Math.PI * 2
          );
          ctx.stroke();

          // Circular Center Dot
          ctx.beginPath();
          ctx.arc(
            originX + outerSize / 2,
            originY + outerSize / 2,
            innerSize / 2,
            0,
            Math.PI * 2
          );
          ctx.fillStyle = eyeColor;
          ctx.fill();
        } else if (style === 'leaf') {
          // Leaf style: curved opposite corners
          ctx.beginPath();
          const ox = originX + cellSize / 2;
          const oy = originY + cellSize / 2;
          const ow = outerSize - cellSize;
          const oh = outerSize - cellSize;
          const r = cellSize * 2;

          ctx.moveTo(ox + r, oy);
          ctx.lineTo(ox + ow, oy);
          ctx.lineTo(ox + ow, oy + oh - r);
          ctx.quadraticCurveTo(ox + ow, oy + oh, ox + ow - r, oy + oh);
          ctx.lineTo(ox, oy + oh);
          ctx.lineTo(ox, oy + r);
          ctx.quadraticCurveTo(ox, oy, ox + r, oy);
          ctx.closePath();
          ctx.stroke();

          // Center leaf
          drawRoundRect(
            originX + innerOffset,
            originY + innerOffset,
            innerSize,
            innerSize,
            cellSize * 0.7,
            eyeColor
          );
        }
      };

      // Top-Left Eye
      drawEye(qrOffsetX, qrOffsetY, eyeStyle);
      // Top-Right Eye
      drawEye(qrOffsetX + (moduleCount - 7) * cellSize, qrOffsetY, eyeStyle);
      // Bottom-Left Eye
      drawEye(qrOffsetX, qrOffsetY + (moduleCount - 7) * cellSize, eyeStyle);

      // 7. Draw Center Business Logo (if enabled)
      if (customization.showLogo) {
        const logoZoneSize = (centerEnd - centerStart + 0.4) * cellSize;
        const logoX = qrOffsetX + centerStart * cellSize - cellSize * 0.2;
        const logoY = qrOffsetY + centerStart * cellSize - cellSize * 0.2;

        // Protective background badge (clean white + frame color ring)
        ctx.save();
        drawRoundRect(
          logoX,
          logoY,
          logoZoneSize,
          logoZoneSize,
          logoZoneSize * 0.28,
          '#FFFFFF',
          eyeColor,
          2
        );

        if (logoImg) {
          // Clip inside badge
          ctx.beginPath();
          const padding = logoZoneSize * 0.12;
          const imgW = logoZoneSize - padding * 2;
          const imgH = logoZoneSize - padding * 2;
          drawRoundRect(
            logoX + padding,
            logoY + padding,
            imgW,
            imgH,
            imgW * 0.2,
            undefined
          );
          ctx.clip();
          ctx.drawImage(logoImg, logoX + padding, logoY + padding, imgW, imgH);
        } else {
          // Monogram initial fallback
          const initial = businessName ? businessName.charAt(0).toUpperCase() : 'O';
          ctx.fillStyle = fg;
          ctx.font = `bold ${Math.round(logoZoneSize * 0.48)}px system-ui, sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(initial, logoX + logoZoneSize / 2, logoY + logoZoneSize / 2);
        }
        ctx.restore();
      }

      // 8. Draw Frame Call-to-Action Elements
      const frameText = customization.frameText || 'SCAN TO ORDER';

      if (isBottomBanner) {
        const bannerW = qrSize;
        const bannerH = 46;
        const bannerX = qrOffsetX;
        const bannerY = qrOffsetY + qrSize + 16;

        drawRoundRect(bannerX, bannerY, bannerW, bannerH, 14, frameColor);

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 15px system-ui, -apple-system, sans-serif';
        ctx.fillText(`⚡ ${frameText}`, bannerX + bannerW / 2, bannerY + bannerH / 2);
      } else if (isTopBanner) {
        const bannerW = qrSize;
        const bannerH = 46;
        const bannerX = qrOffsetX;
        const bannerY = 16;

        drawRoundRect(bannerX, bannerY, bannerW, bannerH, 14, frameColor);

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 15px system-ui, -apple-system, sans-serif';
        ctx.fillText(`▼ ${frameText}`, bannerX + bannerW / 2, bannerY + bannerH / 2);
      } else if (isBadge) {
        const badgeW = qrSize * 0.72;
        const badgeH = 38;
        const badgeX = (canvasW - badgeW) / 2;
        const badgeY = qrOffsetY + qrSize + 16;

        drawRoundRect(badgeX, badgeY, badgeW, badgeH, 19, frameColor);

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 13px system-ui, -apple-system, sans-serif';
        ctx.fillText(`📷 ${frameText}`, badgeX + badgeW / 2, badgeY + badgeH / 2);
      } else if (isCard) {
        // Bottom badge of the card
        const cardPillW = qrSize * 0.75;
        const cardPillH = 40;
        const cardPillX = (canvasW - cardPillW) / 2;
        const cardPillY = qrOffsetY + qrSize + 20;

        drawRoundRect(cardPillX, cardPillY, cardPillW, cardPillH, 20, frameColor);

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 14px system-ui, -apple-system, sans-serif';
        ctx.fillText(`⚡ ${frameText}`, cardPillX + cardPillW / 2, cardPillY + cardPillH / 2);
      }

      // Notify parent component with data URL & canvas reference
      const dataUrl = canvas.toDataURL('image/png');
      if (onGenerated) {
        onGenerated(dataUrl, canvas);
      }
    } catch (err) {
      console.error('Failed to render custom QR code canvas:', err);
    }
  }, [
    targetUrl,
    customization,
    businessName,
    logoImg,
    size,
    onGenerated,
  ]);

  return (
    <div className="flex flex-col items-center justify-center">
      <canvas
        ref={canvasRef}
        className={className || 'max-w-full h-auto rounded-2xl shadow-md border border-slate-200'}
        style={{ width: `${size}px`, maxWidth: '100%' }}
      />
    </div>
  );
}

// Utility to export print-ready PDF
export async function downloadQrPdf({
  canvas,
  businessName,
  targetUrl,
  frameText = 'SCAN TO ORDER',
}: {
  canvas: HTMLCanvasElement;
  businessName: string;
  targetUrl: string;
  frameText?: string;
}) {
  const { jsPDF } = await import('jspdf');

  // Standard A4 Portrait (210 x 297 mm)
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const pageHeight = 297;

  // 1. Subtle Outer Border
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.setLineWidth(0.5);
  doc.roundedRect(12, 12, pageWidth - 24, pageHeight - 24, 6, 6);

  // 2. Business Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text(businessName || 'OrderOne Storefront', pageWidth / 2, 32, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text('Official Contactless Digital Menu & Storefront', pageWidth / 2, 40, { align: 'center' });

  // 3. Render High-Resolution QR Code in Center
  const qrDataUrl = canvas.toDataURL('image/png');
  const qrImageSize = 130; // 130mm x 130mm
  const qrX = (pageWidth - qrImageSize) / 2;
  const qrY = 56;

  doc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrImageSize, qrImageSize);

  // 4. Instructions
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(79, 70, 229); // indigo-600
  doc.text(frameText.toUpperCase(), pageWidth / 2, qrY + qrImageSize + 14, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10.5);
  doc.setTextColor(71, 85, 105); // slate-600
  doc.text(
    '1. Open your smartphone camera or any QR scanner app.',
    pageWidth / 2,
    qrY + qrImageSize + 24,
    { align: 'center' }
  );
  doc.text(
    '2. Point at the QR code above to instantly view the menu & order.',
    pageWidth / 2,
    qrY + qrImageSize + 30,
    { align: 'center' }
  );

  // Direct URL
  doc.setFont('courier', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(targetUrl, pageWidth / 2, qrY + qrImageSize + 40, { align: 'center' });

  // 5. Footer Branding
  doc.setDrawColor(241, 245, 249);
  doc.line(20, pageHeight - 24, pageWidth - 20, pageHeight - 24);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text('Powered by OrderOne.in • High-Speed Contactless Commerce', pageWidth / 2, pageHeight - 17, {
    align: 'center',
  });

  const slug = businessName.toLowerCase().replace(/[^a-z0-9]/g, '-') || 'storefront';
  doc.save(`${slug}-qr-print.pdf`);
}
