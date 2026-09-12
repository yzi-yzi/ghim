# Nguồn nội dung cho Ghim MVP

> Trạng thái: research note — chưa phải tư vấn pháp lý  
> Kiểm chứng lần cuối: 2026-09-11  
> Phạm vi: nghĩa Anh→Việt theo ngữ cảnh, definition/POS/sense, IPA, audio, word forms, examples và collocations

Các số liệu, capability và điều khoản có link trực tiếp là **fact đã kiểm chứng** từ nguồn chính thức tại ngày trên. Các đoạn ghi **recommendation**, **inference** hoặc **được đề xuất** là đánh giá của báo cáo dựa trên các facts đó. Khi vendor không công khai pricing hoặc quyền cache/redistribute, báo cáo ghi là chưa xác minh thay vì suy đoán.

## Kết luận

Không có một nguồn duy nhất vừa bao phủ đủ các trường Ghim cần, vừa có tiếng Việt tốt, vừa cho phép cache/redistribute rõ ràng, vừa phù hợp với một sản phẩm hosted miễn phí.

Stack phù hợp nhất cho MVP là:

1. **Kaikki/Wiktextract (English Wiktionary dump) tự host** làm lexical backbone: lemma, POS, senses, glosses, IPA, forms, một phần examples/translations và liên kết audio.
2. **Open English WordNet 2025** làm fallback ổn định cho English definition/POS/senses khi Wiktionary thiếu hoặc khó parse.
3. **Một LLM giá thấp, gọi từ backend**, nhận source sentence cùng candidate senses để chọn sense và tạo nghĩa tiếng Việt ngắn, learner-friendly; đồng thời có thể đề xuất example/collocation. Mọi output phải có provenance, schema validation, confidence/flags và cho phép người dùng sửa.
4. **Audio ưu tiên file Wikimedia Commons đã qua license allowlist**; nếu không có thì sinh audio bằng Google Cloud Text-to-Speech và cache theo `normalized_text + accent + voice_version`.
5. **Captured sentence của chính người dùng** là example mặc định. Example/collocation công khai hoặc dùng trong starter deck chỉ được lấy từ nguồn có license rõ ràng hoặc do Ghim tạo và kiểm duyệt.

Đây là recommendation, không phải một fact do vendor công bố. Nó tối ưu cho quyền kiểm soát dữ liệu, chi phí thấp, khả năng thay nhà cung cấp và giá trị khác biệt của Ghim: hiểu đúng từ trong ngữ cảnh, thay vì chỉ trả về một entry từ điển chung chung.

## Ma trận nhu cầu

| Thành phần | Nguồn MVP | Fallback | Ghi chú chất lượng |
|---|---|---|---|
| Lemma, POS, senses, English gloss | Kaikki/Wiktextract | Open English WordNet | Ground truth trước khi gọi AI |
| IPA | Wiktextract | CMUdict → ARPABET-to-IPA | CMUdict chỉ là US pronunciation và việc đổi sang IPA là xấp xỉ |
| Word forms | Wiktextract | UniMorph English | Chỉ hiển thị forms hữu ích cho người học, không dump toàn bộ paradigm |
| Nghĩa Việt theo ngữ cảnh | LLM grounded bằng sentence + candidate senses | Google Cloud Translation hoặc DeepL; PanLex chỉ làm hint | Không coi machine output là dictionary authority |
| Audio | Wikimedia Commons file allowlist | Google Cloud TTS | Lưu attribution/license theo từng audio asset |
| Example | Captured sentence riêng tư | Ghim-generated; Tatoeba đã lọc | Không tái xuất bản câu nguồn tùy tiện |
| Collocations | LLM đề xuất, được validate/review | Wiktionary compounds/derived terms; Datamuse làm discovery hint | Không tìm thấy open dataset production-ready đủ rộng cho EN→VI learner app |

## 1. Open-data backbone

### Kaikki/Wiktextract — chọn cho MVP

Wiktextract trích xuất từ Wiktionary các trường Ghim cần nhất: glosses và senses, POS, inflection/conjugation, translations, pronunciations và audio links, examples, related/derived terms và compounds. Tác giả mô tả English Wiktionary extraction là implementation hoàn chỉnh nhất của dự án ([Wiktextract README](https://github.com/tatuylonen/wiktextract)).

Kaikki cung cấp raw English Wiktionary JSONL cập nhật thường xuyên, thường ít nhất mỗi tuần. Snapshot kiểm chứng ngày 2026-09-11 dùng dump 2026-09-02, dung lượng khoảng 2.7 GB compressed; bulk audio khoảng 20.4 GB và không tự động cập nhật ([Kaikki raw downloads](https://kaikki.org/dictionary/rawdata.html)). Trang English postprocessed hiện liệt kê hơn 1.39 triệu distinct word forms và file khoảng 3 GB, nhưng chính trang này đánh dấu download postprocessed cũ sẽ bị bỏ nên production import nên dùng raw feed ([Kaikki English dictionary](https://kaikki.org/dictionary/English/index.html)).

**License fact:** text gốc của Wiktionary được dual-license theo CC BY-SA 4.0 và GFDL. Reuse được phép, kể cả commercial, nhưng phải attribution, dẫn license và tuân thủ ShareAlike cho adapted material; entry cũng có thể chứa quotation/media từ nguồn khác với điều khoản riêng ([Wiktionary copyright policy](https://en.wiktionary.org/wiki/Wiktionary:Copyrights)).

**Cách dùng được đề xuất:** import theo batch vào database của Ghim; lưu `source_page`, dump date, extractor version, license và modified flag theo field/record. Loại quotations khỏi import mặc định. Không gọi Wiktionary live trên mỗi capture. Nếu cần tự build, dùng official Wikimedia dumps; Wikimedia khuyến nghị API clients ưu tiên bulk download, cache, nhận diện User-Agent và backoff ([MediaWiki API etiquette](https://www.mediawiki.org/wiki/API:Etiquette)).

**Rủi ro:** dữ liệu cộng đồng không đồng đều, sense ordering không phải learner frequency, Vietnamese translations không phủ hết và ShareAlike/database-right boundary cần legal review trước khi phát hành data export hoặc shared starter decks. Vì vậy dữ liệu nguồn và nội dung Ghim/AI tạo phải được tách rõ trong schema.

### Open English WordNet — fallback sạch cho senses

Open English WordNet 2025 có bản JSON tải về và gồm common nouns, verbs, adjectives, adverbs cùng semantic graph ([official repository and releases](https://github.com/globalwordnet/english-wordnet)). Dữ liệu được phát hành theo CC BY 4.0, đồng thời yêu cầu attribution cho Princeton WordNet và Open English WordNet team ([official license](https://github.com/globalwordnet/english-wordnet/blob/main/LICENSE.md)).

Nó phù hợp để lấp English definition/POS/sense và làm validation vocabulary. Nó không cung cấp tiếng Việt, audio hay một lớp collocation cho learner app; wording đôi khi kỹ thuật. Đây là fallback, không nên là UX-facing source duy nhất.

### CMUdict và UniMorph — fallback hẹp

[CMU Pronouncing Dictionary](https://github.com/cmusphinx/cmudict) cho US English pronunciations dạng ARPABET và license cho phép dùng/redistribute với acknowledgement. Nó không có recordings và không phải IPA; chuyển ARPABET→IPA là inference của Ghim và phải gắn accent/quality flag.

[UniMorph English](https://github.com/unimorph/eng) cung cấp inflection paradigms theo CC BY-SA 3.0. Dùng nó khi Wiktionary thiếu forms, nhưng không nên kéo cả paradigm vào card. Chỉ chọn forms có learning value như irregular past, past participle hoặc irregular plural.

### PanLex — hint tiếng Việt, không phải contextual dictionary

PanLex cung cấp snapshots CSV/JSON dưới CC0 1.0, cho phép copy, modify và commercial redistribution; dự án yêu cầu/khuyến nghị citation ([PanLex data license](https://panlex.org/license)). PanLex là một kho lexical translations hợp nhất từ hàng nghìn nguồn, không phải learner dictionary và không tự giải quyết sense selection trong một source sentence ([PanLex overview](https://panlex.org/)). Tài liệu kỹ thuật cũ của chính dự án cũng cảnh báo quyền của các nguồn upstream có thể giới hạn một số cách sử dụng dù snapshot được công bố CC0 ([PanLex LREC paper](https://old.panlex.org/pubs/etc/panlex-lrec2014.pdf)).

Vì vậy PanLex chỉ nên cung cấp candidate Vietnamese glosses để cross-check hoặc fallback; không hiển thị tự động như nghĩa đúng theo ngữ cảnh.

### Tatoeba — optional example pool

Tatoeba phát hành sentence và translation-link dumps thường xuyên. Text mặc định dùng CC BY 2.0 FR, một số sentence là CC0; attribution có thể thực hiện qua stable sentence URL hoặc contributor data, và câu đã sửa phải được ghi là modified ([Tatoeba downloads](https://tatoeba.org/en/downloads), [corpus reuse guide](https://en.wiki.tatoeba.org/articles/show/using-the-tatoeba-corpus)). Audio có license riêng theo record; audio không ghi license thì không được reuse ngoài Tatoeba ([Tatoeba FAQ](https://en.wiki.tatoeba.org/articles/show/faq)).

Tatoeba hữu ích cho một tập example được lọc offline, nhưng crowd quality và độ tự nhiên không đồng đều. Nó không nên nằm trên synchronous capture path.

## 2. Translation và AI enrichment

### OpenAI API — recommendation cho contextual enrichment

Một text model có structured output có thể nhận:

- highlighted token/phrase;
- captured sentence và một lượng context tối thiểu;
- candidate English senses từ lexical backbone;
- learner locale `vi-VN` và level khoảng B1–B2;

rồi trả về `selected_sense_id`, nghĩa Việt ngắn theo câu, explanation tùy chọn, useful forms, một example mới và một số collocation candidates.

Tại thời điểm kiểm chứng, standard pricing cho `gpt-5.6-luna` là **$0.20/1M input tokens và $1.20/1M output tokens** ([OpenAI API pricing](https://developers.openai.com/api/docs/pricing)). Với giả định 300 input + 150 output tokens/capture, chi phí model suy ra khoảng **$0.00024/capture**, hay **$2.40/10,000 captures**, trước retries, evals và overhead. Đây là phép tính của báo cáo, không phải quote của OpenAI.

Theo OpenAI Services Agreement, customer giữ quyền đối với Input và sở hữu Output trong phạm vi luật cho phép; API content không được dùng để train model trừ khi customer chủ động đồng ý. Customer vẫn chịu trách nhiệm có quyền với Input và đánh giá accuracy/appropriateness của Output ([OpenAI Services Agreement, §§4.1–4.3](https://openai.com/policies/services-agreement/)). API data không được dùng để train mặc định ([OpenAI data-use policy](https://openai.com/policies/how-your-data-is-used-to-improve-model-performance/)); retention cụ thể phụ thuộc endpoint và account controls ([OpenAI API data controls](https://platform.openai.com/docs/models/default-usage-policies-by-endpoint)).

**Inference:** đây là lựa chọn kinh tế nhất để tạo đồng thời contextual Vietnamese meaning và các field learner-facing, nhưng chỉ nếu grounded. Không được yêu cầu model “hãy viết dictionary entry” khi không đưa candidate senses. Lưu model ID, prompt/schema version, evidence sense IDs, generation timestamp và user edits; chạy golden-set eval cho EN→VI sense selection trước beta.

### Google Cloud Translation — fallback deterministic

Google Cloud Translation chính thức hỗ trợ English↔Vietnamese ([language support](https://docs.cloud.google.com/translate/docs/languages)). NMT translation có 500,000 characters/tháng miễn phí dưới dạng $10 credit, sau đó **$20/1M characters** tới 1 tỷ characters ([pricing](https://cloud.google.com/products/translate/pricing)).

Nó tốt cho dịch một captured sentence hoặc gloss nhưng không trả về POS/sense/IPA/collocation. Khi hiển thị unmodified translation, Google yêu cầu attribution cạnh kết quả, mô tả app/help phải nói dùng Google Translate, và cung cấp disclaimer tương ứng ([attribution requirements](https://docs.cloud.google.com/translate/attribution)). Service-specific terms cấm dùng/giữ translated text để tạo, train hoặc cải thiện một translation system, nhưng không cấm Ghim lưu bản dịch để cung cấp chức năng học từ; việc áp dụng cụ thể vẫn cần legal review ([Google Cloud service terms](https://cloud.google.com/terms/service-terms)).

**Recommendation:** giữ adapter này như fallback khi LLM lỗi hoặc quality gate không đạt, không chọn làm primary vì attribution làm nặng UI và nó không giải quyết contextual sense structure.

### DeepL API — candidate để benchmark, chưa chọn

DeepL API hiện hỗ trợ Vietnamese và API Free cho tối đa 500,000 characters/tháng ([supported languages](https://developers.deepl.com/docs/getting-started/supported-languages), [usage limits](https://developers.deepl.com/docs/resources/usage-limits)). Public docs không công bố một mức Pro toàn cầu cố định có thể quote an toàn trong báo cáo này.

DeepL Pro terms không bảo đảm correctness/accuracy; nếu unmodified API output được hiển thị cho end user, app phải disclose DeepL bằng logo hoặc brand/domain ([DeepL enterprise/API terms §§3.2, 8.3](https://www.deepl.com/en/pro-license-enterprise)). API Pro xử lý submitted text tạm thời và xóa sau khi hoàn thành; API Free chịu privacy rules của free service, trong đó content có thể được human-reviewed trong một số trường hợp ([DeepL privacy policy](https://www.deepl.com/en/privacy)).

**Recommendation:** benchmark EN→VI quality trên golden set nếu muốn một translation fallback thứ hai; không gửi captured sentences có dữ liệu nhạy cảm qua API Free.

## 3. Audio

### Wikimedia Commons — ưu tiên khi license đủ rõ

Wiktextract trả về Commons audio URLs nhưng Commons media dùng license theo **từng file**. Reuser phải kiểm tra file page, credit creator, dẫn license và tuân thủ ShareAlike khi áp dụng; Wikimedia không bảo đảm metadata license luôn đúng ([Commons reuse guide](https://commons.wikimedia.org/wiki/Commons:Reusing_content_outside_Wikimedia/en)). Downloading/self-hosting được khuyến nghị; hotlinking được phép nhưng không được khuyến nghị do asset có thể đổi, bị vandalize, rename hoặc delete ([technical reuse guide](https://commons.wikimedia.org/wiki/Commons:Reusing_content_outside_Wikimedia/technical)).

Pipeline cần allowlist `public domain`, `CC0`, `CC BY`, và các phiên bản `CC BY-SA` mà Ghim sẵn sàng tuân thủ. Với mỗi file, lưu author, Commons file URL, canonical media URL, license/version, attribution text và verification timestamp. Không import mù toàn bộ audio tar.

### Google Cloud Text-to-Speech — fallback có chi phí dự đoán được

Google cho phép dùng audio tạo bởi Cloud TTS để vận hành ứng dụng/media nếu tuân thủ Terms và luật áp dụng ([Cloud TTS basics](https://docs.cloud.google.com/text-to-speech/docs/basics)). Dịch vụ có nhiều English US/UK/AU voices ([voice list](https://cloud.google.com/text-to-speech/docs/voices)). Pricing page hiện ghi Standard voices miễn phí 4M characters/tháng rồi $4/1M; WaveNet/Neural2 miễn phí 1M rồi $16/1M; Chirp 3 HD miễn phí 1M rồi $30/1M ([Cloud TTS pricing](https://cloud.google.com/text-to-speech/pricing)).

Một word/short phrase chỉ tốn rất ít characters, nên audio generation không phải cost driver của MVP. Cache output server-side và version voice để tránh regenerate. TTS vẫn có thể phát âm sai heteronym nếu không truyền đúng context/SSML; pronunciation QA cần word+POS/sense test set.

Browser `speechSynthesis` không tốn server cost nhưng voice phụ thuộc OS/browser và không tạo asset đồng nhất. Nó chỉ nên là emergency fallback, không phải pronunciation source chính ([Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Window/speechSynthesis)).

## 4. Commercial dictionary APIs

| Nguồn | Facts đã kiểm chứng | Đánh giá cho Ghim MVP |
|---|---|---|
| Collins | Definitions, translations, examples, phrases và audio; English-only API miễn phí tới 5,000 calls/tháng, sau đó £50/tháng tới 20k; bilingual tier miễn phí tới 5k rồi £75/tháng tới 30k. Danh sách bilingual hiện không có Vietnamese ([official API page](https://www.collinsdictionary.com/collins-api)). | English lexical quality tốt nhưng không giải quyết EN→VI; quota thấp cho hosted product. Chỉ đáng revisit khi có commercial agreement/caching rights rõ ràng. |
| Merriam-Webster | Collegiate/Learner dictionaries có definitions và audio. Non-commercial use miễn phí dưới 1,000 queries/ngày/reference; commercial hoặc vượt quota phải thương lượng license, và app phải hiển thị logo ([FAQ](https://dictionaryapi.com/info/frequently-asked-questions), [terms](https://dictionaryapi.com/info/terms-of-service), [branding](https://dictionaryapi.com/info/branding-guidelines)). | Không phù hợp free hosted MVP có khả năng monetization; không có Vietnamese. |
| Oxford Dictionaries API | Sandbox chỉ 500 calls và chỉ dữ liệu bắt đầu bằng một chữ cái; production dùng paid Lite/Growing/Enterprise, pricing nằm sau account và Enterprise là annual bespoke fee ([official FAQ](https://developer.oxforddictionaries.com/faq), [getting started](https://developer.oxforddictionaries.com/documentation/getting_started)). | Không đủ pricing/caching transparency để làm MVP dependency; có thể mua sau khi product-market fit. |
| Wordnik | API có definitions/examples/related words nhưng terms cấm cache, record, prefetch hoặc tạo local store; quota có thể thay đổi và attribution phải giữ nguyên ([official API terms](https://developer.wordnik.com/terms)). | Xung đột trực tiếp với offline review, stable cards và export; loại khỏi MVP. |
| Free Dictionary API | Public API không cần key và response có definitions/phonetics/audio; repository GPL-3.0, service vận hành nhờ donation và maintainer nói chi phí server tăng ([official repository](https://github.com/meetDeveloper/freeDictionaryAPI)). API đã chuyển source sang Wiktionary, và recent issues ghi nhận timeout/CORS/wrong or missing entries ([project issues](https://github.com/meetDeveloper/freeDictionaryAPI/issues)). | Có thể dùng để prototype UI trong vài giờ, không dùng production. Tự ingest cùng upstream Wiktionary sẽ kiểm soát provenance/availability tốt hơn. |

## 5. Collocations

Đây là lỗ hổng dữ liệu lớn nhất. Wiktextract có related/derived terms và compounds, nhưng chưa phải learner collocation dataset đầy đủ. [Datamuse](https://www.datamuse.com/api/) có word/context relations, miễn phí tới 100,000 requests/ngày đến 2027-01-01 và yêu cầu acknowledgement trong public app, nhưng score chỉ để xếp hạng chứ không có ý nghĩa xác suất; nó phù hợp để discovery/cross-check, không phải authority.

Sketch Engine có authenticated API và Word Sketch, nhưng yêu cầu paid/trial subscription và fair-usage limits ([official API docs](https://www.sketchengine.eu/documentation/api-documentation/)); một research word-list license mẫu cấm commercial use và lexicography, đồng thời cấm sublicense/distribute source works ([official license specimen](https://www.sketchengine.eu/guide/access-to-unlimited-wordlists/attachment/data_licence_research_wordlist_in_sketch_engine/)). Không nên tích hợp trước khi có hợp đồng cho đúng use case.

**MVP inference:** tạo tối đa 2–3 collocations bằng LLM, grounded bằng captured sentence và lexical relations; gắn `generated`, cho phép report/edit, và chỉ promote collocation vào starter decks sau human review. Nếu không đủ confidence, để trống tốt hơn là tạo sai.

## 6. Captured source sentences

Một câu người dùng bôi đen có thể là copyrighted text và quyền quotation/fair dealing phụ thuộc mục đích, độ dài, jurisdiction và cách phân phối; không có quy tắc “một câu luôn hợp pháp”. Berne framework chỉ cho quotation trong giới hạn justified by purpose và fair practice, còn luật quốc gia quyết định cách áp dụng ([WIPO study of quotation limitations](https://www.wipo.int/edocs/mdocs/copyright/en/sccr_19/sccr_19_6.pdf)).

Chính sách MVP bảo thủ được đề xuất:

- Chỉ capture khi user thực hiện gesture rõ ràng; không crawl trang hoặc gửi cả article.
- Lưu selection ngắn, URL, title, captured timestamp và optional surrounding context; context bổ sung chỉ dùng tạm để disambiguate rồi xóa.
- Sentence mặc định là private, chỉ chủ tài khoản xem; không đưa tự động vào public/shared decks, search index, marketing hay training corpus.
- Cho user edit/delete/export; hỗ trợ domain denylist và không capture password/input/private-app pages.
- Chỉ gửi lượng context tối thiểu sang AI vendor và mô tả việc này trong privacy notice.

Chrome khuyên extension dùng quyền tối thiểu; `activeTab` chỉ cấp temporary access sau user gesture và có thể thay `<all_urls>` trong nhiều trường hợp ([Chrome extension privacy guide](https://developer.chrome.com/docs/extensions/develop/security-privacy/user-privacy)). Chrome Web Store coi minimum permissions là requirement ([user-data policy FAQ](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq)). Do đó extension MVP nên ưu tiên `activeTab` + `contextMenus`/explicit action, không xin persistent access toàn bộ website nếu flow kỹ thuật không thực sự cần.

## 7. Kiến trúc provenance và quality gate

Tách ba lớp dữ liệu:

1. **Source evidence:** dữ liệu nguyên gốc/normalized từ Wiktionary, OEWN, Commons, v.v.; immutable, có source revision và license.
2. **Generated enrichment:** nghĩa Việt, explanation, example, collocations; có provider/model, prompt/schema version, evidence IDs và generation timestamp.
3. **Learner material:** bản user đã chấp nhận/chỉnh sửa, dùng để tạo cards và schedule; không bị silently overwrite khi source/model update.

Mỗi field nên có `origin_type`, `source_id`, `source_url`, `license`, `attribution`, `is_modified`, `confidence`, `review_status`. Audio cần thêm `speaker/voice`, `accent`, `media_hash` và license snapshot.

Quality gate trước beta:

- một golden set ít nhất vài trăm encounters, có polysemy, phrasal verbs, inflected forms và proper nouns;
- người Việt B1–B2 đánh dấu selected sense, natural Vietnamese gloss, IPA/audio correctness và usefulness của collocations;
- đo exact/acceptable sense choice, hallucination rate, blank rate, latency và cost/capture;
- fail closed: nếu lemma/sense confidence thấp, UI hỏi learner chọn/chỉnh nghĩa thay vì lưu confident-looking misinformation.

## 8. Fallback và migration path

1. **MVP:** Kaikki/Wiktextract + OEWN local DB; OpenAI adapter cho enrichment; Commons allowlist + Google TTS fallback.
2. **Nếu LLM outage/budget breach:** lưu capture ngay ở trạng thái `enrichment_pending`; dùng lexical entry local, sau đó async retry. Có thể dùng Google Translation chỉ cho nghĩa tạm với attribution đúng quy định.
3. **Nếu Wiktionary quality không đủ:** mua Collins/Oxford license sau khi xác nhận cache, card persistence, export, attribution và commercial rights bằng văn bản; thay provider qua canonical internal schema, không để vendor payload rò vào domain model.
4. **Nếu scale tăng:** versioned offline import, deduplicate enrichment theo `lemma + sense + normalized context class`, batch non-urgent generation, pre-generate starter decks, và đặt hard daily/monthly spend caps.
5. **Nếu public/shared decks xuất hiện:** legal review riêng cho CC BY-SA adaptations, quotations, per-file audio licenses và redistribution/export; không mặc định rằng quyền hiển thị trong private card đồng nghĩa quyền publish.

## Decision đề xuất

Chấp nhận stack MVP sau:

- **Lexical backbone:** self-hosted Kaikki/Wiktextract raw English data.
- **Sense fallback:** Open English WordNet 2025.
- **Contextual EN→VI + generated learning material:** backend LLM adapter, bắt đầu với `gpt-5.6-luna`, grounded + versioned + editable.
- **Audio:** verified Wikimedia Commons asset; nếu thiếu dùng cached Google Cloud TTS Standard/Neural2.
- **Examples:** captured sentence private; generated/curated content cho starter/public decks.
- **Collocations:** generated candidates with review, không tuyên bố là corpus-verified ở MVP.
- **Không dùng production:** Wordnik, Free Dictionary API, scraped Cambridge/Oxford/Google dictionary content, hoặc bất kỳ audio URL nào thiếu license provenance.

Trước implementation cần hai spike nhỏ: (1) ingest 5–10k common words để đo coverage/shape của Wiktextract; (2) chạy blinded quality/cost eval trên 200–300 real English→Vietnamese encounters. Kết quả hai spike quyết định thresholds và provider, không thay đổi canonical data model.
