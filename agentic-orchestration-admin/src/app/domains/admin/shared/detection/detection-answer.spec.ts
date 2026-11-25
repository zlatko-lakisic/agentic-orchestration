import {
  isDetectionAnswer,
  overlayBoxes,
  parseDetectionResult,
  scaleBoxXyxy,
} from './detection-answer';

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

  it('positions overlay boxes for the displayed image size', () => {
    const answer = {
      detections: [
        { label: 'bus', confidence: 0.91, box_xyxy: [10, 20, 110, 120] },
        { label: 'bad', box_xyxy: [1, 2] },
        { box_xyxy: [0, 0, 200, 200] },
      ],
      image: { width: 200, height: 200 },
    };
    const boxes = overlayBoxes(
      answer,
      null,
      { width: 400, height: 400 },
      { width: 100, height: 100 }
    );
    expect(boxes).toEqual([
      { left: 5, top: 10, width: 50, height: 50, label: 'bus', conf: ' 91%' },
      { left: 0, top: 0, width: 100, height: 100, label: 'obj', conf: '' },
    ]);
  });

  it('falls back to preview then decoded size, and tolerates no answer', () => {
    const answer = { detections: [{ box_xyxy: [0, 0, 50, 50] }] };
    expect(
      overlayBoxes(
        answer,
        { width: 100, height: 100 },
        { width: 999, height: 999 },
        { width: 200, height: 200 }
      )[0]
    ).toMatchObject({ width: 100, height: 100 });
    expect(
      overlayBoxes(answer, null, { width: 50, height: 50 }, { width: 0, height: 0 })[0]
    ).toMatchObject({ width: 50, height: 50 });
    expect(
      overlayBoxes(null, null, { width: 1, height: 1 }, { width: 1, height: 1 })
    ).toEqual([]);
  });
});
