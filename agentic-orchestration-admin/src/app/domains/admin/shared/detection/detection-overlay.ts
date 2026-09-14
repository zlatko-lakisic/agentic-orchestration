import {
  Component,
  ElementRef,
  ViewChild,
  effect,
  input,
  signal,
} from '@angular/core';
import {
  DetectionAnswer,
  DetectionPreview,
  scaleBoxXyxy,
} from '@/app/domains/admin/shared/detection/detection-answer';

@Component({
  selector: 'ao-detection-overlay',
  standalone: true,
  template: `
    <div class="relative inline-block max-w-full overflow-hidden rounded border border-neutral-200 dark:border-neutral-700">
      <img
        #imgEl
        class="block max-h-80 max-w-full object-contain"
        [src]="imgSrc()"
        [alt]="preview()?.name || 'detection frame'"
        (load)="onImageLoad()"
      />
      @for (box of scaledBoxes(); track $index) {
        <div
          class="pointer-events-none absolute border-2 border-emerald-400"
          [style.left.px]="box.left"
          [style.top.px]="box.top"
          [style.width.px]="box.width"
          [style.height.px]="box.height"
        >
          <span
            class="absolute -top-5 left-0 whitespace-nowrap bg-emerald-600/90 px-1 text-[10px] text-white"
          >
            {{ box.label }}{{ box.conf }}
          </span>
        </div>
      }
    </div>
  `,
})
export class DetectionOverlay {
  readonly answer = input<DetectionAnswer | null>(null);
  readonly preview = input<DetectionPreview | null>(null);

  @ViewChild('imgEl') imgEl?: ElementRef<HTMLImageElement>;

  readonly imgSrc = signal('');
  readonly scaledBoxes = signal<
    Array<{ left: number; top: number; width: number; height: number; label: string; conf: string }>
  >([]);

  constructor() {
    effect(() => {
      const p = this.preview();
      const b64 = p?.dataBase64;
      const mime = p?.mimeType || 'image/jpeg';
      this.imgSrc.set(b64 ? `data:${mime};base64,${b64}` : '');
      // Recompute after src change once image loads.
      this.scaledBoxes.set([]);
    });
  }

  onImageLoad() {
    const el = this.imgEl?.nativeElement;
    const ans = this.answer();
    const p = this.preview();
    if (!el || !ans) {
      this.scaledBoxes.set([]);
      return;
    }
    const srcW = Number(ans.image?.width || p?.width || el.naturalWidth || 1);
    const srcH = Number(ans.image?.height || p?.height || el.naturalHeight || 1);
    const destW = el.clientWidth || el.naturalWidth || 1;
    const destH = el.clientHeight || el.naturalHeight || 1;
    const boxes = (ans.detections || [])
      .map((d) => {
        const scaled = scaleBoxXyxy(d.box_xyxy, srcW, srcH, destW, destH);
        if (!scaled) return null;
        const conf =
          d.confidence != null && Number.isFinite(Number(d.confidence))
            ? ` ${(Number(d.confidence) * 100).toFixed(0)}%`
            : '';
        return {
          ...scaled,
          label: String(d.label || 'obj'),
          conf,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x != null);
    this.scaledBoxes.set(boxes);
  }
}
