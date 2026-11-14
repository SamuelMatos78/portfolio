import assert from "node:assert/strict";
import test from "node:test";
import { BattleClock, frameIndexAt } from "../game/playback.js";

test("battle playback uses real elapsed seconds at 1x, 2x, and 4x", () => {
  const clock = new BattleClock(); clock.reset(540); clock.play(0);
  assert.equal(clock.advance(10_000), 10);
  clock.setSpeed(2, 10_000);
  assert.equal(clock.advance(20_000), 30);
  clock.setSpeed(4, 20_000);
  assert.equal(clock.advance(30_000), 70);
  clock.reset(540); clock.setSpeed(4, 0); clock.play(0);
  assert.equal(clock.advance(135_000), 540);
});

test("pausing and changing speed preserves elapsed time, and playback stops at the limit", () => {
  const clock = new BattleClock(); clock.reset(540); clock.play(0); clock.pause(30_000);
  assert.equal(clock.advance(90_000), 30);
  clock.setSpeed(4, 90_000); clock.play(100_000);
  assert.equal(clock.advance(300_000), 540);
  assert.equal(clock.running, false);
  assert.throws(() => clock.setSpeed(5, 0), /inválida/);
});

test("frame lookup handles irregular timing and duplicate tick-zero states", () => {
  const frames = [{ tick: 0 }, { tick: 0 }, { tick: 8 }, { tick: 70 }, { tick: 400 }];
  assert.equal(frameIndexAt(frames, 0), 1);
  assert.equal(frameIndexAt(frames, 69), 2);
  assert.equal(frameIndexAt(frames, 70), 3);
  assert.equal(frameIndexAt(frames, 10_000), 4);
});
