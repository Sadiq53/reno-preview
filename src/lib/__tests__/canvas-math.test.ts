import assert from "assert";
import { calculateNormalizedPosition, denormalizePosition, formatCoordinateDisplay } from "../canvas-math";

async function runTests() {
  console.log("📐 Running Canvas Coordinate Normalizer Unit Tests...\n");

  // Test 1: Normal click inside viewport
  console.log("1. Testing normalized coordinate calculation");
  const event = {
    clientX: 500,
    clientY: 300,
    canvasRect: {
      left: 100,
      top: 100,
      width: 800,
      height: 600,
    },
    scrollOffset: 50,
    activeViewportWidth: 800,
    activeViewportHeight: 600,
  };

  const result = calculateNormalizedPosition(event);
  assert.strictEqual(result.posX, 50.0, "posX should be exactly 50%");
  assert.strictEqual(result.posY, 41.67, "posY should be 41.67%");
  assert.strictEqual(result.viewportWidth, 800);
  assert.strictEqual(result.viewportHeight, 600);
  assert.strictEqual(result.scrollY, 50);
  console.log("   ✔ Normalized position calculation passed");

  // Test 2: Clamping bounds [0, 100]
  console.log("2. Testing bounds clamping [0.00% to 100.00%]");
  const outOfBoundsLeft = {
    clientX: 50, // left of canvas
    clientY: 50,
    canvasRect: { left: 100, top: 100, width: 800, height: 600 },
    activeViewportWidth: 800,
    activeViewportHeight: 600,
  };
  const resultLeft = calculateNormalizedPosition(outOfBoundsLeft);
  assert.strictEqual(resultLeft.posX, 0);
  assert.strictEqual(resultLeft.posY, 0);

  const outOfBoundsRight = {
    clientX: 1200,
    clientY: 1000,
    canvasRect: { left: 100, top: 100, width: 800, height: 600 },
    activeViewportWidth: 800,
    activeViewportHeight: 600,
  };
  const resultRight = calculateNormalizedPosition(outOfBoundsRight);
  assert.strictEqual(resultRight.posX, 100);
  assert.strictEqual(resultRight.posY, 100);
  console.log("   ✔ Coordinate clamping passed");

  // Test 3: Denormalization back to pixels
  console.log("3. Testing denormalization to pixel offsets");
  const coords = { posX: 25, posY: 50 };
  const viewport = { width: 1440, height: 900 };
  const pixelCoords = denormalizePosition(coords, viewport);
  assert.strictEqual(pixelCoords.x, 360, "25% of 1440px should be 360px");
  assert.strictEqual(pixelCoords.y, 450, "50% of 900px should be 450px");
  console.log("   ✔ Denormalization back to pixels passed");

  // Test 4: Format display
  console.log("4. Testing formatCoordinateDisplay string formatting");
  const formatted = formatCoordinateDisplay({ posX: 45.234, posY: 12.876 });
  assert.strictEqual(formatted, "X: 45.2% · Y: 12.9%");
  console.log("   ✔ Coordinate display formatting passed");

  console.log("\n🎉 All canvas-math unit tests passed 100%!");
}

runTests().catch((err) => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});
