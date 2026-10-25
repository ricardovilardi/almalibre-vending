# Almalibre · Vending kiosk prototype

A clickable prototype of the Almalibre açaí vending machine UI. The screen is 1080×1920 portrait, and the prototype scales it to fit any browser.

**Flow:** Idle loop → Welcome → Toppings (+ info sheet) → Summary → Payment → Preparing (live cup fill) → Ready → back to idle

## Run it locally

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000.

- `?kiosk=1` hides the prototype toolbar and shows the screen full-bleed.
- In **Pago**, tap the yellow circle to simulate tapping a card. Tick "Simular pago rechazado" to see the declined state.

## Publish on GitHub Pages

Go to Settings → Pages → Deploy from branch → `main` / root. The site will be at `https://<user>.github.io/<repo>/`.

## Swapping in real videos

Put files into `assets/video/` using these names. They replace the animated fallbacks automatically:

| File | Screen | Spec |
|---|---|---|
| `attract.mp4` | Idle loop (before anyone touches the screen) | 1080×1920, 15–25 s seamless loop, H.264, no audio, under 8 MB |
| `fill.mp4` | Preparing | Square or 4:5, white background, empty cup → açaí swirl, 4–6 s, ends on the full cup |

The preparing screen shows the açaí step for as long as `fill.mp4` runs, then adds the toppings.

## Changing prices and toppings

The prices and toppings are in `TOPPINGS`, `PRICE_BASE` and `PRICE_EXTRA` at the top of `app.js`. The current prices are placeholders: €4.50 for the bowl, which includes 1 topping, and +€1.00 for each extra topping.
