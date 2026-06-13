# Loki Stats Bot - Medya ve Varlıklar (Assets)

Bu klasör, botunuzun istatistik kartı çizerken kullanacağı özel yazı tipleri (.ttf, .otf) veya özel arka plan resimlerini (.png, .jpg) barındırmak için tasarlanmıştır.

## Özelleştirme İpuçları

1. **Özel Arka Plan Kullanma**:
   - Eğer Canvas kartının arkasına özel bir tasarım yerleştirmek isterseniz, resmi bu klasöre (örn: `Global/Assets/background.png`) yükleyin.
   - Ardından `Global/Utils/CanvasHelper.ts` dosyasında `loadImage` fonksiyonu ile bu resmi yükleyerek düz gradyan yerine arka plana çizdirebilirsiniz:
     ```typescript
     const bgImage = await loadImage(path.join(__dirname, "..", "Assets", "background.png"));
     ctx.drawImage(bgImage, 0, 0, width, height);
     ```

2. **Özel Yazı Tipi (Font) Yükleme**:
   - `@napi-rs/canvas` kütüphanesi sistem yazı tiplerini otomatik tanır. Ancak sunucunuzda (örn: Linux VPS) istediğiniz font yoksa, font dosyasını buraya ekleyip `index.ts` veya `CanvasHelper.ts` başlangıcında şu şekilde kaydedebilirsiniz:
     ```typescript
     import { GlobalFonts } from "@napi-rs/canvas";
     import * as path from "path";
     
     GlobalFonts.registerFromPath(path.join(__dirname, "..", "Assets", "font-adi.ttf"), "FontAdi");
     ```
