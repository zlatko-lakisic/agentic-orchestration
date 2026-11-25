import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  effect,
  input,
  signal,
} from '@angular/core';
import {
  DetectionAnswer,
  DetectionPreview,
  OverlayBox,
  overlayBoxes,
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
export class DetectionOverlay implements AfterViewInit, OnDestroy {
  readonly answer = input<DetectionAnswer | null>(null);
  readonly preview = input<DetectionPreview | null>(null);

  @ViewChild('imgEl') imgEl?: ElementRef<HTMLImageElement>;

  readonly imgSrc = signal('');
  readonly scaledBoxes = signal<OverlayBox[]>([]);
  private resizeObserver: ResizeObserver | null = null;

  constructor() {
    effect(() => {
      const p = this.preview();
      const b64 = p?.dataBase64;
      const mime = p?.mimeType || 'image/jpeg';
      this.imgSrc.set(b64 ? `data:${mime};base64,${b64}` : '');
    });
    effect(() => {
      // Recompute whenever the inputs change. A new object carrying the same
      // image does not fire the <img> load event again, so relying on (load)
      // alone left the frame without boxes.
      this.answer();
      this.preview();
      this.imgSrc();
      queueMicrotask(() => this.recompute());
    });
  }

  ngAfterViewInit() {
    const el = this.imgEl?.nativeElement;
    if (!el || typeof ResizeObserver === 'undefined') return;
    // Boxes are in displayed pixels: follow the image when the layout resizes.
    this.resizeObserver = new ResizeObserver(() => this.recompute());
    this.resizeObserver.observe(el);
  }

  ngOnDestroy() {
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
  }

  onImageLoad() {
    this.recompute();
  }

  private recompute() {
    const el = this.imgEl?.nativeElement;
    // Until the current src has decoded there is nothing to measure; the
    // (load) handler recomputes once it has.
    if (!el || !el.complete || !el.naturalWidth) {
      this.scaledBoxes.set([]);
      return;
    }
    this.scaledBoxes.set(
      overlayBoxes(
        this.answer(),
        this.preview(),
        { width: el.naturalWidth, height: el.naturalHeight },
        { width: el.clientWidth, height: el.clientHeight }
      )
    );
  }
}
