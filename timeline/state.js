export const state = {
  width: 0,
  height: 0,

  centerY: 0,

  viewStart: 0,
  viewEnd: 0,

  titleMaxLength: 64
};

export const categoryColors = {
    'Open Frequency': [231, 76, 60],           // #e74c3c
    'Mission Briefs (Events)': [46, 204, 113], // #2ecc71
    'Communications': [52, 152, 219],          // #3498db
    'Reports': [243, 156, 18]                  // #f39c12
};

export function rgba(rgb, a = 1) {
    if (!Array.isArray(rgb) || rgb.length < 3) {
        rgb = [153, 153, 153]; // fallback gray
    }
    const [r, g, b] = rgb;
    return `rgba(${r}, ${g}, ${b}, ${a})`;
}
