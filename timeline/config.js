export const URL = 'https://argo.ex-astris.net/tljson';

export const LANES = [
  'Open Frequency',
  'Mission Briefs (Events)',
  'Reports',
  'Communications',
  'Other'
];

export const laneIndex = new Map(
  LANES.map((name, i) => [name, i])
);

export const laneColors = {
  'Open Frequency': '#1f77b4',
  'Mission Briefs (Events)': '#ff7f0e',
  'Reports': '#2ca02c',
  'Communications': '#d62728',
  'Other': '#7f7f7f'
};

export const laneHeight = 60;
export const lanePadding = 6;
export const laneStep = laneHeight + lanePadding;

export const margin = { top: 20, right: 20, bottom: 50, left: 40 };
export const outerWidth = 1024;
export const outerHeight = 440;
