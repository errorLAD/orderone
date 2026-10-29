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
  size?: number; // base render size (e.g. 360 for preview, 520 for standard)
  className?: string;
  tableNumber?: string;
  roomNumber?: string;
  onGenerated?: (dataUrl: string, canvas: HTMLCanvasElement) => void;
}

export function CustomQrCanvas({
  targetUrl,
  customization,
  businessName,
  businessLogo,
  size = 360,
  className,
  tableNumber,
  roomNumber,
  onGenerated,
}: CustomQrCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [logoImg, setLogoImg] = useState<HTMLImageElement | null>(null);
  const [headerLogoImg, setHeaderLogoImg] = useState<HTMLImageElement | null>(null);
  const [orderOneLogoImg, setOrderOneLogoImg] = useState<HTMLImageElement | null>(null);

  const activeCenterLogoUrl = customization.customLogoUrl || businessLogo;
  const activeHeaderLogoUrl = customization.headerLogoUrl || businessLogo;

  // Pre-load merchant center logo image if enabled
  useEffect(() => {
    if (!customization.showLogo || !activeCenterLogoUrl) {
      setLogoImg(null);
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = activeCenterLogoUrl;
    img.onload = () => setLogoImg(img);
    img.onerror = () => {
      console.warn('Failed to load center logo image, using monogram/badge fallback');
      setLogoImg(null);
    };
  }, [customization.showLogo, activeCenterLogoUrl]);

  // Pre-load merchant header logo image if enabled
  useEffect(() => {
    if (!customization.showHeaderLogo || !activeHeaderLogoUrl) {
      setHeaderLogoImg(null);
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = activeHeaderLogoUrl;
    img.onload = () => setHeaderLogoImg(img);
    img.onerror = () => {
      console.warn('Failed to load header logo image');
      setHeaderLogoImg(null);
    };
  }, [customization.showHeaderLogo, activeHeaderLogoUrl]);

  // Pre-load OrderOne footer brand logo
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = '/logo.png';
    img.onload = () => setOrderOneLogoImg(img);
    img.onerror = () => {
      console.warn('Failed to load OrderOne brand logo');
      setOrderOneLogoImg(null);
    };
  }, []);

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

      // 2. Determine frame layout and geometry
      const frameStyle: QrFrameStyle = customization.frameStyle || 'bottom_banner';
      const isCard = frameStyle === 'card';
      const isBottomBanner = frameStyle === 'bottom_banner';
      const isTopBanner = frameStyle === 'top_banner';
      const isBadge = frameStyle === 'badge';
      const isSimpleBorder = frameStyle === 'simple_border';

      // Header specifications (Optional Title, Subtitle, and Logo)
      const showHeader = customization.showBusinessName !== false;
      const showTitle = customization.showHeaderTitle !== false;
      const displayBizName = (customization.headerTitle || businessName || '').trim();
      const displaySubtitle = (customization.headerSubtitle || '').trim();
      const hasHeaderLogo = customization.showHeaderLogo === true && !!headerLogoImg;

      // Table / Room badge label (from customization or props)
      const badgeLabel = (
        customization.centerBadgeText ||
        tableNumber ||
        roomNumber ||
        ''
      ).trim();

      // Dynamic header height based on options enabled
      let headerH = 14;
      if (showHeader && (hasHeaderLogo || (showTitle && displayBizName) || displaySubtitle)) {
        if (hasHeaderLogo && showTitle && displayBizName) {
          headerH = 96;
        } else if (hasHeaderLogo) {
          headerH = 68;
        } else if (showTitle && displayBizName) {
          headerH = 74;
        } else {
          headerH = 46;
        }
      }

      // Canvas dimensions & proportional scaling
      const canvasW = size;
      const qrSize = Math.round(canvasW * 0.74);
      const qrOffsetX = Math.round((canvasW - qrSize) / 2);
      let qrOffsetY = headerH + 8;

      let bannerH = 0;
      let bannerY = 0;
      let bannerW = qrSize;
      let bannerX = qrOffsetX;

      if (isBottomBanner) {
        bannerH = 42;
        bannerY = qrOffsetY + qrSize + 12;
      } else if (isTopBanner) {
        bannerH = 42;
        bannerY = headerH + 6;
        qrOffsetY = bannerY + bannerH + 12;
      } else if (isBadge) {
        bannerH = 34;
        bannerW = Math.round(qrSize * 0.76);
        bannerX = Math.round((canvasW - bannerW) / 2);
        bannerY = qrOffsetY + qrSize + 12;
      } else if (isCard) {
        bannerH = 40;
        bannerW = Math.round(qrSize * 0.82);
        bannerX = Math.round((canvasW - bannerW) / 2);
        bannerY = qrOffsetY + qrSize + 14;
      }

      const footerH = 22;
      const footerGap = bannerH > 0 ? 14 : 16;
      const footerCenterY =
        bannerH > 0
          ? bannerY + bannerH + footerGap + footerH / 2
          : qrOffsetY + qrSize + footerGap + footerH / 2;

      const canvasH = Math.round(footerCenterY + footerH / 2 + 16);

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

      // 3. Colors & Luminance calculation
      const bg = isValidHexColor(customization.backgroundColor) ? customization.backgroundColor : '#FFFFFF';
      const fg = isValidHexColor(customization.foregroundColor) ? customization.foregroundColor : '#4F46E5';
      const eyeColor = isValidHexColor(customization.eyeColor) ? customization.eyeColor : fg;
      const frameColor = isValidHexColor(customization.frameColor) ? customization.frameColor : fg;

      // Perceived background brightness
      const isDarkBg = (() => {
        const c = bg.replace('#', '');
        const r = parseInt(c.substring(0, 2), 16) || 0;
        const g = parseInt(c.substring(2, 4), 16) || 0;
        const b = parseInt(c.substring(4, 6), 16) || 0;
        return (r * 0.299 + g * 0.587 + b * 0.114) < 130;
      })();

      // Base Canvas Background Fill
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, canvasW, canvasH);

      // Standee Outer Rounded Border Frame
      const outerBorderColor = isDarkBg ? 'rgba(255, 255, 255, 0.14)' : 'rgba(15, 23, 42, 0.08)';
      drawRoundRect(6, 6, canvasW - 12, canvasH - 12, 22, undefined, outerBorderColor, 1.5);

      if (isSimpleBorder) {
        drawRoundRect(10, 10, canvasW - 20, canvasH - 20, 20, undefined, frameColor, 2.5);
      } else if (isCard) {
        drawRoundRect(
          8,
          8,
          canvasW - 16,
          canvasH - 16,
          22,
          undefined,
          isDarkBg ? 'rgba(255, 255, 255, 0.22)' : '#CBD5E1',
          2
        );
      }

      // 4. Upper Header (Optional Title, Optional Logo, Optional Subtitle)
      if (showHeader && headerH > 14) {
        let currentHeaderY = 18;

        // A. Optional Header Logo
        if (hasHeaderLogo && headerLogoImg) {
          const hLogoH = 26;
          const hAspect = headerLogoImg.width / headerLogoImg.height;
          const hLogoW = Math.min(Math.round(hLogoH * hAspect), 120);
          const hLogoX = Math.round((canvasW - hLogoW) / 2);

          ctx.save();
          drawRoundRect(hLogoX - 4, currentHeaderY - 2, hLogoW + 8, hLogoH + 4, 6, '#FFFFFF', undefined, 0);
          ctx.drawImage(headerLogoImg, hLogoX, currentHeaderY, hLogoW, hLogoH);
          ctx.restore();

          currentHeaderY += hLogoH + 8;
        }

        // B. Optional Header Title (Store / Restaurant / Hotel Name)
        if (showTitle && displayBizName) {
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = isDarkBg ? '#FFFFFF' : '#0F172A';

          let titleFontSize = 20;
          if (displayBizName.length > 28) {
            titleFontSize = 13;
          } else if (displayBizName.length > 20) {
            titleFontSize = 15;
          } else if (displayBizName.length > 14) {
            titleFontSize = 17;
          }

          ctx.font = `800 ${titleFontSize}px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
          ctx.fillText(displayBizName.toUpperCase(), canvasW / 2, currentHeaderY + 8);
          currentHeaderY += 22;
        }

        // C. Optional Subtitle / Tagline
        if (displaySubtitle) {
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = isDarkBg ? '#94A3B8' : '#64748B';
          ctx.font = '700 9.5px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
          ctx.fillText(displaySubtitle.toUpperCase(), canvasW / 2, currentHeaderY + 2);
          currentHeaderY += 14;
        }

        // D. Decorative Accent Hairline Divider with Center Dot
        const divY = Math.min(currentHeaderY + 2, headerH + 2);
        const divHalfW = 60;
        ctx.strokeStyle = isDarkBg ? 'rgba(255, 255, 255, 0.18)' : 'rgba(15, 23, 42, 0.12)';
        ctx.lineWidth = 1;

        ctx.beginPath();
        ctx.moveTo(canvasW / 2 - divHalfW, divY);
        ctx.lineTo(canvasW / 2 - 12, divY);
        ctx.stroke();

        ctx.fillStyle = eyeColor;
        ctx.beginPath();
        ctx.arc(canvasW / 2, divY, 2.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(canvasW / 2 + 12, divY);
        ctx.lineTo(canvasW / 2 + divHalfW, divY);
        ctx.stroke();
      }

      // 5. Calculate QR module positions
      const cellSize = qrSize / moduleCount;

      // Check if coordinate is inside one of the 3 Corner Finder Patterns (7x7 modules)
      const isFinder = (r: number, c: number) => {
        if (r < 7 && c < 7) return true; // Top-Left
        if (r < 7 && c >= moduleCount - 7) return true; // Top-Right
        if (r >= moduleCount - 7 && c < 7) return true; // Bottom-Left
        return false;
      };

      // Check if coordinate is in center logo exclusion zone (ONLY if showLogo is TRUE)
      const centerStart = Math.floor(moduleCount * 0.38);
      const centerEnd = Math.ceil(moduleCount * 0.62);
      const isCenter = (r: number, c: number) => {
        // When Middle Logo is disabled/optional, NO modules are excluded!
        if (!customization.showLogo) return false;
        return r >= centerStart && r <= centerEnd && c >= centerStart && c <= centerEnd;
      };

      // 6. Draw QR Data Modules
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

      // 7. Draw Custom Corner Eyes (3 Finder Patterns: Top-Left, Top-Right, Bottom-Left)
      const eyeStyle: QrEyeStyle = customization.eyeStyle || 'rounded';

      const drawEye = (originX: number, originY: number, style: QrEyeStyle) => {
        const outerSize = 7 * cellSize;
        const innerSize = 3 * cellSize;
        const innerOffset = 2 * cellSize;

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
          ctx.beginPath();
          ctx.arc(
            originX + outerSize / 2,
            originY + outerSize / 2,
            outerSize / 2 - cellSize / 2,
            0,
            Math.PI * 2
          );
          ctx.stroke();

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

      // 8. Draw Center Middle Badge (OPTIONAL: Logo, Table/Room Number, or Both)
      if (customization.showLogo) {
        const logoZoneSize = (centerEnd - centerStart + 0.4) * cellSize;
        const logoX = qrOffsetX + centerStart * cellSize - cellSize * 0.2;
        const logoY = qrOffsetY + centerStart * cellSize - cellSize * 0.2;

        ctx.save();
        // Protective background badge (clean white + frame color or eye color ring)
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

        const activeBadgeType = customization.centerBadgeType || (badgeLabel ? 'table_room' : 'logo');

        if (activeBadgeType === 'table_room' && badgeLabel) {
          // Center Badge: Table No / Room No (e.g. "Table 4" or "Room 101" or "Temple 1")
          const parts = badgeLabel.trim().split(/\s+/);
          if (parts.length >= 2) {
            const prefix = parts[0].toUpperCase();
            const num = parts.slice(1).join(' ').toUpperCase();

            // Line 1: TABLE / ROOM / TEMPLE
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#64748B';
            ctx.font = `800 ${Math.round(logoZoneSize * 0.17)}px system-ui, sans-serif`;
            ctx.fillText(prefix, logoX + logoZoneSize / 2, logoY + logoZoneSize * 0.35);

            // Line 2: Big Bold Number (4 / 101 / 2)
            ctx.fillStyle = frameColor || fg;
            ctx.font = `900 ${Math.round(logoZoneSize * 0.38)}px system-ui, sans-serif`;
            ctx.fillText(num, logoX + logoZoneSize / 2, logoY + logoZoneSize * 0.68);
          } else {
            // Single word (e.g. "101" or "T4")
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = frameColor || fg;
            ctx.font = `900 ${Math.round(logoZoneSize * 0.34)}px system-ui, sans-serif`;
            ctx.fillText(badgeLabel.toUpperCase(), logoX + logoZoneSize / 2, logoY + logoZoneSize / 2);
          }
        } else if (activeBadgeType === 'both' && badgeLabel) {
          // Both Logo & Table/Room Number
          const topH = logoZoneSize * 0.52;
          const botH = logoZoneSize * 0.48;

          // Top: Logo or Monogram
          if (logoImg) {
            ctx.beginPath();
            const pad = topH * 0.12;
            const imgSize = topH - pad * 2;
            drawRoundRect(
              logoX + (logoZoneSize - imgSize) / 2,
              logoY + pad + 2,
              imgSize,
              imgSize,
              imgSize * 0.2,
              undefined
            );
            ctx.clip();
            ctx.drawImage(
              logoImg,
              logoX + (logoZoneSize - imgSize) / 2,
              logoY + pad + 2,
              imgSize,
              imgSize
            );
          } else {
            const initial = displayBizName ? displayBizName.charAt(0).toUpperCase() : 'O';
            ctx.fillStyle = fg;
            ctx.font = `bold ${Math.round(topH * 0.62)}px system-ui, sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(initial, logoX + logoZoneSize / 2, logoY + topH / 2 + 2);
          }

          // Bottom: Mini Table/Room Pill Badge
          const pillW = logoZoneSize * 0.88;
          const pillH = botH * 0.68;
          const pillX = logoX + (logoZoneSize - pillW) / 2;
          const pillY = logoY + topH + 3;

          drawRoundRect(pillX, pillY, pillW, pillH, pillH * 0.35, frameColor || fg);
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = '#FFFFFF';
          ctx.font = `800 ${Math.round(pillH * 0.54)}px system-ui, sans-serif`;
          ctx.fillText(badgeLabel.toUpperCase(), pillX + pillW / 2, pillY + pillH / 2);
        } else {
          // Logo or Monogram Fallback
          if (logoImg) {
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
            const initial = displayBizName ? displayBizName.charAt(0).toUpperCase() : 'O';
            ctx.fillStyle = fg;
            ctx.font = `bold ${Math.round(logoZoneSize * 0.48)}px system-ui, sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(initial, logoX + logoZoneSize / 2, logoY + logoZoneSize / 2);
          }
        }
        ctx.restore();
      }

      // 9. Draw Frame Call-to-Action Elements
      const frameText = (customization.frameText || 'SCAN TO ORDER').toUpperCase();

      if (isBottomBanner) {
        drawRoundRect(bannerX, bannerY, bannerW, bannerH, 12, frameColor);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 14px system-ui, -apple-system, sans-serif';
        ctx.fillText(`⚡ ${frameText}`, bannerX + bannerW / 2, bannerY + bannerH / 2);
      } else if (isTopBanner) {
        drawRoundRect(bannerX, bannerY, bannerW, bannerH, 12, frameColor);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 14px system-ui, -apple-system, sans-serif';
        ctx.fillText(`▼ ${frameText}`, bannerX + bannerW / 2, bannerY + bannerH / 2);
      } else if (isBadge) {
        drawRoundRect(bannerX, bannerY, bannerW, bannerH, 17, frameColor);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 12.5px system-ui, -apple-system, sans-serif';
        ctx.fillText(`📷 ${frameText}`, bannerX + bannerW / 2, bannerY + bannerH / 2);
      } else if (isCard) {
        drawRoundRect(bannerX, bannerY, bannerW, bannerH, 18, frameColor);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 13.5px system-ui, -apple-system, sans-serif';
        ctx.fillText(`⚡ ${frameText}`, bannerX + bannerW / 2, bannerY + bannerH / 2);
      }

      // 10. Footer: Official "Powered by OrderOne.in" branding
      const footerText = 'Powered by';
      ctx.font = '500 11px system-ui, -apple-system, sans-serif';
      const textMetrics = ctx.measureText(footerText);
      const textW = textMetrics.width;

      const logoH = 14;
      const logoW = Math.round(logoH * 2.646); // ~37px (aspect ratio of 1024x387)
      const inBadgeW = 20;
      const inBadgeH = 13;
      const spacing = 5;

      const totalFooterW = textW + spacing + logoW + spacing + inBadgeW;
      const footerStartX = Math.round((canvasW - totalFooterW) / 2);

      // A. "Powered by" text
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = isDarkBg ? '#94A3B8' : '#64748B';
      ctx.fillText(footerText, footerStartX, footerCenterY);

      // B. OrderOne Brand Logo
      const logoX = footerStartX + textW + spacing;
      const logoY = Math.round(footerCenterY - logoH / 2);

      if (isDarkBg) {
        // Protective clean white pill on dark backgrounds for sharp contrast
        drawRoundRect(logoX - 3, logoY - 2, logoW + 6, logoH + 4, 3, '#FFFFFF');
      }

      if (orderOneLogoImg) {
        ctx.drawImage(orderOneLogoImg, logoX, logoY, logoW, logoH);
      } else {
        ctx.font = 'bold 11px system-ui, sans-serif';
        ctx.fillStyle = isDarkBg ? '#FFFFFF' : '#0F172A';
        ctx.fillText('OrderOne', logoX, footerCenterY);
      }

      // C. ".in" Tag Pill
      const inX = logoX + logoW + spacing;
      const inY = Math.round(footerCenterY - inBadgeH / 2);
      drawRoundRect(
        inX,
        inY,
        inBadgeW,
        inBadgeH,
        3,
        isDarkBg ? '#064E3B' : '#ECFDF5',
        isDarkBg ? '#047857' : '#A7F3D0',
        1
      );
      ctx.font = '800 8.5px monospace';
      ctx.fillStyle = isDarkBg ? '#34D399' : '#065F46';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('.in', inX + inBadgeW / 2, footerCenterY);

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
    headerLogoImg,
    orderOneLogoImg,
    size,
    tableNumber,
    roomNumber,
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
  doc.text((businessName || 'OrderOne Storefront').toUpperCase(), pageWidth / 2, 32, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text('Official Contactless Digital Menu & Storefront', pageWidth / 2, 40, { align: 'center' });

  // 3. Render High-Resolution Standee QR Card in Center (preserving natural aspect ratio)
  const qrDataUrl = canvas.toDataURL('image/png');
  const canvasAspect = canvas.width / canvas.height;
  const imgW = 125;
  const imgH = imgW / canvasAspect;
  const imgX = (pageWidth - imgW) / 2;
  const imgY = 50;

  doc.addImage(qrDataUrl, 'PNG', imgX, imgY, imgW, imgH);

  // 4. Instructions below card
  const instrStartY = imgY + imgH + 12;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(79, 70, 229); // indigo-600
  doc.text(frameText.toUpperCase(), pageWidth / 2, instrStartY, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(71, 85, 105); // slate-600
  doc.text(
    '1. Open your smartphone camera or any QR scanner app.',
    pageWidth / 2,
    instrStartY + 8,
    { align: 'center' }
  );
  doc.text(
    '2. Point at the QR code above to instantly view the menu & order.',
    pageWidth / 2,
    instrStartY + 14,
    { align: 'center' }
  );

  // Direct URL
  doc.setFont('courier', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text(targetUrl, pageWidth / 2, instrStartY + 23, { align: 'center' });

  // 5. Footer Branding
  doc.setDrawColor(241, 245, 249);
  doc.line(20, pageHeight - 24, pageWidth - 20, pageHeight - 24);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text('Powered by OrderOne.in • High-Speed Contactless Commerce', pageWidth / 2, pageHeight - 17, {
    align: 'center',
  });

  const slug = (businessName || 'storefront').toLowerCase().replace(/[^a-z0-9]/g, '-') || 'storefront';
  doc.save(`${slug}-qr-print.pdf`);
}
