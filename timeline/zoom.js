export function createZoom({
  canvas,
  minZoom,
  maxZoom,
  innerWidth,
  innerHeight,
  onZoom
}) {
  const zoom = d3.zoom()
    .scaleExtent([minZoom, maxZoom])
    .translateExtent([
      [-innerWidth, 0],
      [innerWidth * 2, innerHeight]
    ])
    .on("zoom", onZoom);

  const selection = d3.select(canvas).call(zoom);

  return { zoom, selection };
}
