import { state, categoryColors, rgba } from "../state.js";
import { timeToX } from "../scales/time.js";

export function drawLabels(ctx, data) {
    ctx.save();

    const baseY = state.centerY;
    const dotY = state.centerY;

    const paddingTop = 10;
    const paddingBottom = 10;
    const boxPaddingX = 8;
    const boxPaddingY = 6;
    const boxRadius = 6;

    const minY = paddingTop + 12;
    const maxY = state.height - paddingBottom;

    const titleFont = "13px sans-serif";
    const metaFont = "11px sans-serif";

    const titleHeight = 14;
    const metaHeight = 12;
    const lineGap = 2;

    const labelHeight = titleHeight + lineGap + metaHeight;

    ctx.lineWidth = 1;
    ctx.textAlign = "left";

    const drawnRects = [];
    state.labelRects = [];

    for (let i = 0; i < data.length; i++) {
        const d = data[i];

        const x = timeToX(d.time);

        const titleText = d.title.length > state.titleMaxLength ? 
            d.title.slice(0, state.titleMaxLength) + "..."
            : d.title;

        const tags = d.tags ?? [];
        const metaText =
            tags.slice(0, 5).join(" · ") +
            (tags.length > 5 ? " · ..." : "");

        ctx.font = titleFont;
        const titleWidth = ctx.measureText(titleText).width;

        ctx.font = metaFont;
        const metaWidth = ctx.measureText(metaText).width;

        const textWidth = Math.max(titleWidth, metaWidth);
        const textHeight = labelHeight + 6;

        const textOffsetX = -12;
        const textX = x + textOffsetX;

        let offsetY = (i % 2 === 0 ? 1 : -1) * 36;
        const direction = offsetY > 0 ? 1 : -1;
        const rowStep = 56;

        let attempts = 0;
        const maxAttempts = 10;

        let rect;
        let labelY;
        let placed = false;

        while (attempts < maxAttempts) {
            labelY = baseY + offsetY;

            if (labelY < minY || labelY > maxY) {
                break;
            }

            rect = {
                x: textX,
                y: labelY - titleHeight,
                w: textWidth,
                h: textHeight
            };

            if (!drawnRects.some(r => rectsIntersect(r, rect))) {
                placed = true;
                break;
            }

            offsetY += direction * rowStep;
            attempts++;
        }

        if (!placed) {
            continue;
        }

        drawnRects.push(rect);
        state.labelRects.push({ rect, datum: d });

        // leading line (dot → label)
        const labelMidY = labelY + (labelHeight / 2) - (titleHeight / 2);

        ctx.strokeStyle = "rgba(255,255,255,0.3)";
        ctx.lineWidth = 1;

        ctx.save();
        ctx.globalCompositeOperation = "destination-over";

        ctx.beginPath();
        ctx.moveTo(x, dotY);
        ctx.lineTo(x, labelMidY);
        ctx.stroke();

        ctx.restore();

        const boxX = rect.x - boxPaddingX;
        const boxY = rect.y - boxPaddingY;
        const boxW = rect.w + boxPaddingX * 2;
        const boxH = rect.h + boxPaddingY * 2;

        // background
        const fillBase = categoryColors[d.category.name] ?? [153, 153, 153];
        ctx.fillStyle = rgba(adjustColor(fillBase, -5), 0.90);
        drawRoundedRect(ctx, boxX, boxY, boxW, boxH, boxRadius);
        ctx.fill();

        // title
        ctx.font = titleFont;
        ctx.fillStyle = "#fff";
        ctx.fillText(titleText, textX, labelY);

        // meta
        ctx.font = metaFont;
        ctx.fillStyle = "rgba(255,255,255,0.7)";
        ctx.fillText(
            metaText,
            textX,
            labelY + titleHeight + lineGap
        );
    }

    ctx.restore();
}

function rectsIntersect(r1, r2) {
    return !(
        r2.x > r1.x + r1.w ||
        r2.x + r2.w < r1.x ||
        r2.y > r1.y + r1.h ||
        r2.y + r2.h < r1.y
    );
}

function drawRoundedRect(ctx, x, y, w, h, r) {
    const radius = Math.min(r, w / 2, h / 2);

    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    ctx.lineTo(x + radius, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
}

function adjustColor(rgb) {
    const [r, g, b] = rgb;

    // weighted gray for desaturation
    const gray = 0.299 * r + 0.587 * g + 0.114 * b;

    return [r, g, b].map(v => {
        // move toward gray (desaturate ~45%)
        const mixed = v + (gray - v) * 0.20;

        // then darken (~35%)
        const darkened = mixed * 0.45;

        return Math.round(Math.max(0, Math.min(255, darkened)));
    });
}
