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
    'Reports': [243, 156, 18],                  // #f39c12
    'Short Stories': [155, 89, 182],            // #9b59b6
    'Forum Roleplay': [155, 89, 182], 
    'Transcripts': [155, 89, 182],    
    'Art': [155, 89, 182],            
    'Ship Records': [26, 188, 156],              // #1abc9c
    'Personnel Records': [26, 188, 156],
    'Astrometrics': [26, 188, 156],
    'Organizations': [26, 188, 156],
    'Miscellaneous': [26, 188, 156]
};

export function rgba(rgb, a = 1) {
    if (!Array.isArray(rgb) || rgb.length < 3) {
        rgb = [153, 153, 153]; // fallback gray
    }
    const [r, g, b] = rgb;
    return `rgba(${r}, ${g}, ${b}, ${a})`;
}
