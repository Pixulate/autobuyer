import { readFileSync, writeFileSync } from "node:fs";
import { Resvg } from "@resvg/resvg-js";

const src = new URL("../assets/icons/company/carlooploop.svg", import.meta.url);
let svg = readFileSync(src, "utf8");

function render(svgText, out, background) {
  const resvg = new Resvg(svgText, {
    fitTo: { mode: "width", value: 1024 },
    background,
  });
  writeFileSync(out, resvg.render().asPng());
}

const iconOut = new URL("../assets/images/icon.png", import.meta.url);
const androidOut = new URL("../assets/images/android-icon-foreground.png", import.meta.url);
const monoOut = new URL("../assets/images/android-icon-monochrome.png", import.meta.url);
const splashOut = new URL("../assets/images/splash-icon.png", import.meta.url);

render(svg, iconOut, "#FFFFFF");
render(svg, androidOut, "rgba(0,0,0,0)");
render(svg, monoOut, "rgba(0,0,0,0)");
render(svg.replaceAll('fill="black"', 'fill="#FFFFFF"'), splashOut, "rgba(0,0,0,0)");
console.log("rasterized company svg into icon, android, splash");
