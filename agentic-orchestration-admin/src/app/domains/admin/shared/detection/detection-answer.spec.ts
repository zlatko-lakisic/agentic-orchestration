import { scaleBoxXyxy, parseDetectionResult, isDetectionAnswer } from './detection-answer';

describe('detection-answer helpers', () => {
  it('parses detection JSON', () => {
    const text = JSON.stringify({
      detections: [{ label: 'bus', confidence: 0.9, box_xyxy: [10, 20, 110, 120] }],
      image: { width: 200, height: 200 },
    });
    expect(isDetectionAnswer(text)).toBe(true);
    expect(parseDetectionResult(text)?.detections.length).toBe(1);
    expect(isDetectionAnswer('hello')).toBe(false);
  });

  it('scales box_xyxy to displayed size', () => {
    const box = scaleBoxXyxy([10, 20, 110, 120], 200, 200, 100, 100);
    expect(box).toEqual({ left: 5, top: 10, width: 50, height: 50 });
  });
});
