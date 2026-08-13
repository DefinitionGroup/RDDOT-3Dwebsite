# German/EU privacy and retention quality gates

Research date: 2026-08-13  
Scope: customer Quote Requests and lead enquiries, notice and consent evidence, Project/Customer Account deletion, AI-image input/output processing and transfers, cookies/analytics, personal-data breaches, and DPIA screening.  
Source policy: EU legislation, German federal legislation, the EDPB, the German Datenschutzkonferenz (DSK), the BfDI, and German supervisory-authority material only.

## Answer first

There is **no authoritative German/EU source that supplies one universal retention period for every Quote Request or lead enquiry**. The release must not encode “keep all quotes for six/ten years” or “delete every quote with the Project” without first classifying the controller, the document, and the purpose.

The legally supportable structure is:

1. Process the data needed to answer a customer-initiated Quote Request or service enquiry under Article 6(1)(b) GDPR where the processing is objectively necessary for requested pre-contractual steps. The EDPB expressly gives responding to a person's enquiry about service offerings as an example. This basis does not cover unsolicited marketing initiated by the controller. ([GDPR Article 6](https://eur-lex.europa.eu/eli/reg/2016/679/art_6/oj), [EDPB Guidelines 2/2019, paras. 45-47](https://www.edpb.europa.eu/sites/default/files/files/file1/edpb_guidelines-art_6-1-b-adopted_after_public_consultation_en.pdf))
2. When the enquiry is closed, delete or irreversibly anonymise it unless a separately documented purpose and lawful basis still applies. Storage limitation requires identifiable data to be kept no longer than necessary, and erasure is required when the purpose has ended unless an Article 17(3) exception applies. ([GDPR Articles 5 and 17](https://eur-lex.europa.eu/eli/reg/2016/679/2016-05-04))
3. A Quote Request that legally qualifies as a received commercial/business letter may require **six years from the end of the calendar year of receipt**. A record that later qualifies as an accounting voucher may require **eight years**. These classifications come from HGB section 257 and AO section 147; they do not make every lead, image, Project, or account a retained commercial record. ([HGB section 257](https://www.gesetze-im-internet.de/hgb/__257.html), [AO section 147](https://www.gesetze-im-internet.de/ao_1977/__147.html))
4. The ordinary civil limitation period is three years and normally starts at the end of the year in which the claim arose and the creditor knew or should have known the relevant circumstances. GDPR Article 17(3)(e) permits processing necessary for legal claims, but this is not an automatic permission to retain every field of every enquiry. The controller must identify the plausible claims and retain only evidence actually necessary for them. ([BGB sections 195 and 199](https://www.gesetze-im-internet.de/bgb/__195.html), [BGB section 199](https://www.gesetze-im-internet.de/bgb/__199.html), [GDPR Article 17(3)(e)](https://eur-lex.europa.eu/eli/reg/2016/679/art_17/oj))
5. Account or Project deletion should purge the application-owned data. A legally retained Quote Request must move to a purpose-restricted archive, be detached from the live account/Project, and be reduced to the fields required by that retention purpose. If no documented retention rule applies, the Quote Request is deleted with the Project/account.
6. Article 13 privacy information is a notice, not a consent checkbox. Record which notice was delivered, but do not force an “acceptance” of processing that relies on Article 6(1)(b) or 6(1)(c). Separate, optional consent is required only for processing that actually relies on consent, such as non-essential device access or some marketing. ([GDPR Articles 7 and 13](https://eur-lex.europa.eu/eli/reg/2016/679/2016-05-04), [DSK Short Paper 20](https://www.datenschutzkonferenz-online.de/media/kp/dsk_kpnr_20.pdf))
7. AI-image generation needs a processing-step data map, an Article 28 processor contract where the provider acts only on instructions, transparent disclosure, controllable deletion, and a Chapter V transfer mechanism for any third-country transfer. “AI consent” does not cure a missing processor contract, uncontrolled provider training, or an invalid recurring transfer. ([DSK AI guidance](https://www.datenschutzkonferenz-online.de/media/oh/20240506_DSK_Orientierungshilfe_KI_und_Datenschutz.pdf), [GDPR Articles 28 and 44-49](https://eur-lex.europa.eu/eli/reg/2016/679/2016-05-04))
8. Non-essential analytics that writes or reads information on a user's device requires prior informed consent under section 25 TDDDG. The exception is limited to transmission or access/storage that is strictly necessary to provide the digital service expressly requested by the user. ([TDDDG section 25](https://www.gesetze-im-internet.de/ttdsg/__25.html), [DSK Telemedia Guidance 2021 v1.1](https://www.datenschutzkonferenz-online.de/media/oh/20211220_oh_telemedien.pdf))
9. The controller needs a rehearsed breach process: risk assessment and documentation for every personal-data breach, supervisory-authority notification without undue delay and where feasible within 72 hours unless risk is unlikely, and direct communication without undue delay where high risk is likely. ([GDPR Articles 33-34](https://eur-lex.europa.eu/eli/reg/2016/679/2016-05-04), [EDPB Guidelines 9/2022](https://www.edpb.europa.eu/documents/guideline/guidelines-92022-on-personal-data-breach-notification-under-gdpr_en))
10. AI does not automatically mean a DPIA, but the controller must perform and record a pre-screen. A DPIA is mandatory where the planned processing is likely to cause high risk; the DSK warns this will often be the case for AI and requires provider information sufficient for the assessment. ([GDPR Article 35](https://eur-lex.europa.eu/eli/reg/2016/679/art_35/oj), [BfDI DPIA overview](https://www.bfdi.bund.de/DE/Fachthemen/Inhalte/Technik/Datenschutz-Folgenabschaetzungen.html), [DSK AI guidance, section 2.3](https://www.datenschutzkonferenz-online.de/media/oh/20240506_DSK_Orientierungshilfe_KI_und_Datenschutz.pdf))

This is research and architecture guidance, not a legal opinion. The exact controller identity, German merchant/tax status, record classification, limitation-risk purpose, and provider transfer arrangement require German counsel and the controller's tax adviser/DPO before release.

## 1. Legal facts versus architecture inferences

| Topic | Binding or regulator-backed fact | Architecture inference for this product | Required human decision |
|---|---|---|---|
| Quote response | Article 6(1)(b) covers processing necessary for requested pre-contractual steps; EDPB includes answering a service enquiry. | Collect only contact details, configuration snapshot, note, and selected image actually needed to respond. | Business must define what sales staff need; counsel approves the basis per processing step. |
| Later marketing | Article 6(1)(b) does not cover controller-initiated unsolicited marketing. Email marketing normally requires prior express consent under UWG section 7(2), subject to the narrow existing-customer exception in section 7(3). | Quote contact permission must not subscribe the person to marketing. Keep a separate marketing-consent state and suppression state. | Marketing channels and purposes; whether the section 7(3) exception is ever used. |
| Storage | Articles 5(1)(c), 5(1)(e), and 17 require minimisation, storage limitation, and erasure when no purpose remains, subject to exceptions. | Every table/object class needs a purpose owner, trigger, exact deletion deadline, and tested deletion worker. | Business closure point and counsel-approved period for non-statutory claims evidence. |
| Commercial/tax archive | Qualifying received/sent commercial or business letters are six-year records; qualifying accounting vouchers are eight-year records; periods start at year end. | Classify a submitted Quote Request on submission/closure. Copy only the legally required record into a restricted archive; do not freeze its entire Project graph. | Whether rotpunkt Signature's operator is within HGB section 257 and whether each Quote Request class is a Handels-/Geschaeftsbrief. Tax adviser should sign off. |
| Claims | Article 17(3)(e) permits data necessary for legal claims. German ordinary limitation is three years, usually from year end. | Use a narrow legal-hold/claims record, not a blanket “keep everything for three years.” | Counsel identifies plausible claims, necessary evidence, start event, and legal-hold overrides. |
| Notice | Article 13 requires purposes, bases, recipients, transfers, storage period/criteria, rights, complaint route, required-data consequences, and relevant automated-decision information. | Version and archive the displayed notice; store delivery evidence with the event. Do not call notice delivery “consent.” | Controller/DPO contact, recipient list, actual periods, transfer wording. |
| Consent | If consent is the basis, the controller must prove it; it must be specific, informed, freely given, affirmative, and as easy to withdraw as to give. | Store purpose-level consent receipts; never bundle marketing, analytics, and AI into one checkbox. | Which processing genuinely relies on consent. |
| Deletion audit | GDPR requires accountability and minimisation, but it does not generally require a permanent subject-level deletion ledger. German authority guidance says a deletion concept will regularly be needed for accountability. | Keep non-personal operational deletion events wherever possible. A record that still identifies the deleted person is personal data and needs its own purpose and deadline. | Whether individual proof is needed for disputes and for how long. |
| AI provider | Each personal-data processing step needs a basis; an external provider is often a processor only where it acts on the controller's instructions. Chapter V governs third-country transfers. | Prefer no-training, closed processing; prohibit people/documents; strip metadata; execute an Article 28 DPA; maintain subprocessor/transfer inventory; test provider deletion. | Provider role, purposes, locations, transfer mechanism, retention, training, support access. |
| Analytics/device access | TDDDG section 25 requires consent before non-exempt device storage/access, independent of whether the information is personal data. GDPR still governs subsequent personal-data processing. | Launch without optional analytics, or block every non-essential SDK/request until valid consent. | Whether analytics is necessary at all and its exact measurement purpose. |
| Breach | Articles 33-34 establish risk-based authority and data-subject notification; Article 33(5) requires breach documentation. | One incident register and clock, processor escalation, decision log, authority contact, and notification templates. | Competent German supervisory authority and named incident decision-makers. |
| DPIA | Article 35 requires a DPIA before likely-high-risk processing, particularly considering new technologies, nature, scope, context, and purposes. | Run a documented DPIA pre-screen before enabling customer AI; repeat on provider/model/data-purpose changes. | DPO/counsel approves the screen and any full DPIA; consult authority if residual high risk remains. |

Sources for the table: [GDPR consolidated text](https://eur-lex.europa.eu/eli/reg/2016/679/2016-05-04), [HGB section 257](https://www.gesetze-im-internet.de/hgb/__257.html), [AO section 147](https://www.gesetze-im-internet.de/ao_1977/__147.html), [BGB sections 195 and 199](https://www.gesetze-im-internet.de/bgb/__195.html), [UWG section 7](https://www.gesetze-im-internet.de/uwg_2004/__7.html), [LfD Niedersachsen deletion guidance](https://www.lfd.niedersachsen.de/startseite/themen/technik_und_organisation/festlegung_von_loschfristen_im_offentlichen_bereich/hilfestellungen-fuer-verantwortliche-bei-der-festlegung-von-loeschfristen-168232.html).

## 2. Quote Request and lead-enquiry lifecycle

### 2.1 Purpose and lawful-basis split

**Legal facts**

- The controller must assign a lawful basis to each purpose, not to the customer or database row as a whole. Article 6(1)(b) is available only to the extent processing is objectively necessary for contract performance or requested pre-contractual steps. ([GDPR Article 6](https://eur-lex.europa.eu/eli/reg/2016/679/art_6/oj), [EDPB Guidelines 2/2019](https://www.edpb.europa.eu/documents/guideline/guidelines-22019-on-the-processing-of-personal-data-under-article-61b-gdpr-in_en))
- A customer asking for an offer or details of a service can fall within Article 6(1)(b) even if no contract is ultimately made. Controller-initiated unsolicited marketing does not. ([EDPB Guidelines 2/2019, paras. 45-47](https://www.edpb.europa.eu/sites/default/files/files/file1/edpb_guidelines-art_6-1-b-adopted_after_public_consultation_en.pdf))
- Legal obligations can support retention under Article 6(1)(c); legitimate interests under Article 6(1)(f) require a real interest, necessity, and balancing against the person's interests and rights. Consent should not be substituted where the processing is necessary to perform the user's request. ([GDPR Articles 6-7](https://eur-lex.europa.eu/eli/reg/2016/679/2016-05-04))
- Direct email marketing normally requires prior express consent under UWG section 7(2)(2). The existing-customer exception applies only when all section 7(3) conditions are satisfied. A person who only requested a quote is not automatically a customer from whom an email address was obtained “in connection with the sale.” ([UWG section 7](https://www.gesetze-im-internet.de/uwg_2004/__7.html))

**Architecture inference**

Model at least these separate purposes and bases:

| Purpose | Candidate basis | Release behavior |
|---|---|---|
| Validate and submit a customer-requested Quote Request | Article 6(1)(b) | No forced privacy “consent”; show Article 13 notice before submission. |
| Contact the person to answer that request | Article 6(1)(b) | Contact is limited to the request and its follow-up. |
| Preserve a qualifying commercial/tax record | Article 6(1)(c) plus HGB/AO rule | Restricted archive with exact statutory class/deadline. |
| Preserve selected evidence for concrete legal claims | Article 6(1)(f) and Article 17(3)(e), subject to necessity/balancing | Separate restricted claims purpose/legal hold; field-level minimisation. |
| Newsletter or later sales campaigns | Consent plus UWG section 7, unless counsel approves a specific exception | Separate unchecked control, receipt, withdrawal, suppression. |
| Product analytics | Depends on design; TDDDG consent for non-essential device access and a GDPR basis for personal-data processing | Disabled before consent; no coupling to Quote Request. |

The current domain term “consent” inside a Quote Request should be split into explicit semantic fields such as `privacyNoticeVersion`, `quoteContactAcknowledgementVersion`, and optional `marketingConsentReceiptId`. A notice or acknowledgement is not a GDPR consent merely because the UI uses a checkbox.

### 2.2 Retention classification

**Legal facts**

- HGB section 257(1)(2)-(3) requires merchants to retain received commercial letters and copies of sent commercial letters. A commercial letter is a document concerning a commercial transaction. Those records are retained for six years; accounting vouchers are eight years; the period starts at the end of the calendar year of receipt, dispatch, or creation. ([HGB section 257](https://www.gesetze-im-internet.de/hgb/__257.html))
- AO section 147 requires received and sent commercial/business letters to be retained, along with documents relevant to taxation. The “other” records in section 147(1), including business letters, are six-year records; accounting vouchers are eight-year records; the period also starts at the end of the calendar year. It may continue while the documents remain relevant to taxes whose assessment period has not expired. ([AO section 147](https://www.gesetze-im-internet.de/ao_1977/__147.html))
- The regular civil limitation period is three years and normally starts at year end when the claim arose and the creditor knew or should have known the relevant facts and debtor. Longer maximum periods exist for some claims. ([BGB sections 195 and 199](https://www.gesetze-im-internet.de/bgb/__195.html), [BGB section 199](https://www.gesetze-im-internet.de/bgb/__199.html))
- Legal-claim retention is allowed only “to the extent” necessary. Storage limitation and minimisation continue to apply. ([GDPR Articles 5 and 17(3)(e)](https://eur-lex.europa.eu/eli/reg/2016/679/2016-05-04))

**Architecture inference: required retention matrix**

| Record class | Trigger | Exact period | Scope |
|---|---|---|---|
| Open Quote Request | Submission until commercial closure | Business-defined service window; must be stated in notice | Only fields required to answer and manage the request. |
| Closed request with no ongoing purpose | Closure | Delete promptly under the approved deletion SLA | Full request and links; aggregate truly anonymous metrics may remain. |
| Qualifying Handels-/Geschaeftsbrief | Receipt/dispatch | Six years from calendar-year end | The letter/request and metadata required by HGB/AO, not the whole account/Project. |
| Qualifying accounting voucher | Voucher creation | Eight years from calendar-year end | The voucher and required accounting context. A nonbinding request is not automatically a voucher. |
| Narrow claims file | Claim-risk trigger | Counsel-defined period, often analysed against the three-year regular limitation period plus any justified completion buffer | Only facts necessary for identified claims; legal hold pauses scheduled deletion for named material. |

**Release blocker:** German counsel and the operator's tax adviser must produce the actual mapping from the application's Quote Request fields to HGB/AO record classes. They must also decide whether rejected/abandoned requests that do not qualify for statutory retention are deleted immediately at closure or after a short, justified operational window. No primary source found supports inventing a universal 90-day, three-year, six-year, eight-year, or ten-year default for all such records.

### 2.3 Data minimisation within a retained request

Retention applies by purpose and record, not by object graph. The restricted archive should normally avoid or sever:

- live Customer Account and Project authorization links;
- mutable Working Configuration and unrelated revisions;
- session, authentication, device, analytics, and IP history;
- unrelated Generated Photos and Source Captures;
- free-form internal notes not needed for the archive purpose;
- marketing state, except a separate minimal consent/suppression record;
- provider execution logs and URLs.

The retained snapshot may include the minimum contact and request content necessary to understand the commercial correspondence, plus its receipt time, locale, legally relevant configuration/price snapshot, and archive classification. Whether the selected Generated Photo or full configuration payload is necessary is a field-by-field legal/business decision; a convenient historical rendering is not itself a statutory retention purpose.

## 3. Notice, consent, and evidence

### 3.1 Article 13 notice

**Legal facts**

At collection, Article 13 requires the controller to provide, in clear and accessible form, at least controller/DPO contact information; purposes and bases; legitimate interests where used; recipients/categories; intended third-country transfers and safeguards; retention period or criteria; data-subject rights; withdrawal where consent is used; complaint rights; whether fields are legally/contractually required and consequences of not providing them; and relevant Article 22 automated-decision information. A new incompatible purpose requires information before further processing. ([GDPR Articles 12-13](https://eur-lex.europa.eu/eli/reg/2016/679/2016-05-04))

The LfD Niedersachsen explains that Article 13/14 information exists so people are aware of processing and can assess its lawfulness and exercise rights; the controller must be able to demonstrate proper fulfilment. ([LfD Niedersachsen Article 13/14 guidance](https://www.lfd.niedersachsen.de/dsgvo/informationspflichten_auskunftsrechte/informationspflichten-aus-art-13-und-14-ds-gvo-165813.html))

**Architecture inference**

For each Quote Request and first AI-generation event, retain:

- immutable notice key/version and content hash;
- an archived copy or immutable content artifact for that version;
- locale and delivery surface;
- event type and timestamp;
- the application record ID while that record lawfully exists.

Do not require the customer to “agree to the privacy policy.” The UI can say that the notice was provided or use a factual acknowledgement when needed for UX evidence. The act of submitting a requested quote supplies the request; it does not create marketing consent.

### 3.2 Consent receipt

**Legal facts**

- Where consent is the basis, Article 7(1) requires the controller to prove it. Consent must be distinguishable, intelligible, purpose-specific, informed, freely given, and affirmative. Withdrawal must be as easy as giving consent. ([GDPR Articles 4(11) and 7](https://eur-lex.europa.eu/eli/reg/2016/679/2016-05-04))
- The DSK states that electronic consent must be logged and that pointing only to a correctly designed web page is insufficient to prove an individual consent. It connects this duty to accountability and data protection by design/default. ([DSK Short Paper 20, page 2](https://www.datenschutzkonferenz-online.de/media/kp/dsk_kpnr_20.pdf))

**Architecture inference**

A minimal consent receipt should contain:

- stable purpose key, not a generic `consent=true`;
- notice/consent-text version and locale;
- affirmative decision and timestamp;
- collection method/surface;
- account or consent-subject reference while necessary;
- withdrawal timestamp and method, if withdrawn.

Do not retain raw IP address, full user agent, session contents, or form payload merely “for proof” unless counsel documents why it is necessary. After withdrawal or account deletion, continued retention of an identifiable receipt needs its own purpose and deadline. A marketing suppression record may be needed to honour an objection, but it should be isolated and minimised rather than used as a shadow customer profile.

The GDPR supplies no universal number of years for consent receipts. Counsel must align their period with the underlying processing, enforcement/claims analysis, and minimisation. The product should retain the immutable text version independently from personal receipts so the wording can be proven without retaining every former customer.

## 4. Customer Account and Project deletion

### 4.1 Legal boundary

**Legal facts**

- Personal data must be erased without undue delay when no longer necessary, consent is withdrawn without another basis, a valid objection succeeds, processing was unlawful, or law requires erasure. Exceptions include necessary legal obligations and legal claims. ([GDPR Article 17](https://eur-lex.europa.eu/eli/reg/2016/679/art_17/oj))
- The controller must communicate erasure/restriction to recipients unless impossible or disproportionate, and tell the person about those recipients on request. ([GDPR Article 19](https://eur-lex.europa.eu/eli/reg/2016/679/2016-05-04))
- Data protection by design/default requires measures that limit, by default, the amount, extent, storage period, and accessibility of personal data. ([GDPR Article 25](https://eur-lex.europa.eu/eli/reg/2016/679/2016-05-04))
- German supervisory guidance says a deletion concept will regularly be necessary to satisfy accountability. ([LfD Niedersachsen deletion guidance](https://www.lfd.niedersachsen.de/startseite/themen/technik_und_organisation/festlegung_von_loschfristen_im_offentlichen_bereich/hilfestellungen-fuer-verantwortliche-bei-der-festlegung-von-loeschfristen-168232.html))

### 4.2 Architecture quality gate

After the approved reversible window, permanent Customer Account deletion must:

1. revoke active sessions and credentials;
2. block new writes and provider jobs;
3. enumerate every owned Project, revision, share, Photo Job, Source Capture, Generated Photo, Quote Request, notification, consent receipt, and provider reference;
4. purge records with no surviving purpose;
5. send deletion instructions to processors/recipients and track completion/retry;
6. detach and minimise any Quote Request retained under an approved statutory/claims rule;
7. ensure restores do not resurrect deleted production records (for example, replay deletion tombstones before restored service is exposed);
8. allow encrypted backups to age out under a documented, access-restricted schedule rather than remaining an operational copy;
9. produce a completion result and customer-facing confirmation;
10. remove the deletion case's identifying data on its own approved deadline.

“Anonymised” means the person is no longer identifiable by means reasonably likely to be used. Merely deleting `customerAccountId`, pseudonymising it, or hashing an email does not necessarily anonymise a detailed quote/configuration/photo. If the archive can reconnect the person, it remains personal data and must be described and protected as such.

### 4.3 Minimal deletion audit record

**Legal facts**

The GDPR creates accountability obligations but no general requirement for a perpetual personally identifiable deletion log. Article 30's record of processing activities is a process inventory, not a command to preserve every deleted subject. Article 33(5) expressly requires documentation of personal-data breaches, which is a different record class. ([GDPR Articles 5(2), 24, 30, and 33(5)](https://eur-lex.europa.eu/eli/reg/2016/679/2016-05-04))

A German authority's deletion-concept example recommends procedural deletion logs containing deletion date, deletion-concept version, affected process, applied rule, and number of deleted records, while avoiding personal medical data. It is sector-specific and predates GDPR, so it is useful design guidance rather than a general binding retention rule. ([LfD Niedersachsen/DKG deletion-concept example, page 27](https://www.lfd.niedersachsen.de/download/86184/Information_der_DKG.pdf))

**Architecture inference**

Prefer an operational event with no subject identifier:

```text
deletionEventId (random)
objectClass
policyKey + policyVersion
triggerClass (expiry | account deletion | project deletion | request)
startedAt + completedAt
result (completed | partial | retrying | failed)
deletedRecordCount / deletedObjectCount
processorInstructionStatuses (no provider payload or customer identifier)
worker/release version
```

Do not keep email, account ID, configuration hash, photo hash, request text, or a stable hash of an identifier in the operational deletion ledger by default. If counsel requires proof that a named request was fulfilled, keep a separate, access-restricted case record with a narrowly stated legal-claims/accountability purpose and an exact deletion deadline. The report cannot derive that deadline from a general GDPR article; counsel must set it.

## 5. AI image input/output disclosure and transfers

### 5.1 Personal-data determination and purpose

**Legal facts**

- The DSK says the personal-data assessment must cover the entire lifecycle and not only names/addresses. Context can re-establish identity; both AI inputs and outputs can contain personal data. Each processing step involving personal data needs a basis. ([DSK AI guidance, sections 1.3, 1.5, and 3.1](https://www.datenschutzkonferenz-online.de/media/oh/20240506_DSK_Orientierungshilfe_KI_und_Datenschutz.pdf))
- The DSK prefers technically closed systems. Open cloud systems create risks of reuse for other purposes, disclosure to other users, and third-country transfers. It recommends applications that do not use input/output for training and that do not retain input history beyond need. ([DSK AI guidance, sections 1.7, 1.9, 1.10, and 2.5](https://www.datenschutzkonferenz-online.de/media/oh/20240506_DSK_Orientierungshilfe_KI_und_Datenschutz.pdf))
- If an external AI cloud acts on the controller's instructions, an Article 28 contract is generally required. If provider and application jointly decide purposes/means, Article 26 may apply; if the provider uses data for its own purpose, calling it a processor in the UI or contract does not resolve the role. ([GDPR Articles 26 and 28](https://eur-lex.europa.eu/eli/reg/2016/679/2016-05-04), [DSK AI guidance, section 2.1](https://www.datenschutzkonferenz-online.de/media/oh/20240506_DSK_Orientierungshilfe_KI_und_Datenschutz.pdf))
- People must be transparently informed when their personal data are entered into an AI system or transferred to its provider. Outputs with personal data can trigger a basis and, where data were not obtained from that person, Article 14 information analysis. ([DSK AI guidance, section 3.1](https://www.datenschutzkonferenz-online.de/media/oh/20240506_DSK_Orientierungshilfe_KI_und_Datenschutz.pdf))

**Architecture inference**

Before generation, the concise disclosure plus linked privacy detail should identify:

- that an external AI system generates an illustrative image;
- controller and provider role, provider/recipient category, and named provider where material;
- exact inputs: Source Capture, curated scene preset, configuration/product facts, technical metadata;
- purposes and lawful basis for application processing and provider execution;
- whether input/output/logs are used for provider training or other provider purposes;
- processing/storage countries, subprocessors/categories, and Chapter V safeguard;
- application and provider retention/deletion periods or criteria;
- output limitations, human review where applicable, and that no commercial/product truth is created;
- rights, deletion behavior, complaint route, and how to avoid submitting third-party personal data.

First-release controls should reject people, faces, identity documents, visible mail/address labels, and unsupported sensitive content; strip EXIF/location/device metadata before upload; send no account/email/quote-note data to the generator; use short-lived signed input access; disable training/history contractually and technically; and delete provider references/staging artifacts on a tested schedule. A customer's promise that they “have rights” is useful policy evidence but does not replace the controller's basis, transparency, minimisation, processor, security, and transfer duties.

The current architecture's versioned “AI processing acknowledgement” is sound as UX evidence if the chosen lawful basis is not consent. It must not be described as consent unless counsel selects Article 6(1)(a), validates voluntariness and necessity, and implements withdrawal consequences. The acknowledgement should be separate from optional marketing/analytics consent.

### 5.2 International transfers

**Legal facts**

- Chapter V applies where personal data are transferred to a third country. Transfers require an adequacy decision under Article 45, appropriate safeguards under Article 46 (for example approved standard contractual clauses), or a narrowly applicable Article 49 derogation. ([GDPR Articles 44-49](https://eur-lex.europa.eu/eli/reg/2016/679/2016-05-04))
- The EDPB's final Recommendations 01/2020 require exporters using Article 46 tools to map transfers, assess whether the destination's law/practice undermines the tool, adopt effective supplementary measures where possible, and suspend/avoid a transfer where essentially equivalent protection cannot be achieved. ([EDPB Recommendations 01/2020, final](https://www.edpb.europa.eu/documents/recommendation/recommendations-012020-on-measures-that-supplement-transfer-tools-to_en))
- Article 13 requires information about intended third-country transfers and the adequacy decision or Article 46/47/49 safeguards and how to obtain a copy. ([GDPR Article 13](https://eur-lex.europa.eu/eli/reg/2016/679/2016-05-04))

**Architecture inference / release gate**

No customer personal data may reach an AI provider until procurement has:

1. executed an Article 28 DPA with instructions, confidentiality, security, subprocessor, rights-assistance, return/deletion, audit, and breach terms;
2. mapped every processing/support/log/backup/subprocessor location and onward transfer;
3. documented the Article 45 or 46 mechanism for each transfer and, where Article 46 is used, a transfer-impact assessment and effective supplementary measures;
4. confirmed no provider training or independent reuse unless separately analysed, disclosed, and lawfully based;
5. verified retention, deletion, support access, and breach timelines in writing and operational tests;
6. preserved an immediate disable-new-generation kill switch.

Recurring production inference should not be designed around the exceptional Article 49 derogations or a bundled “explicit transfer consent.” The current scoped Replicate exception still requires this gate; this report does not treat a DPA or an acknowledgement as proof of EU-only processing.

### 5.3 AI Act transparency now applicable

Article 50 AI Act transparency obligations apply from 2 August 2026. Providers of generative systems must mark synthetic outputs in a machine-readable and detectable way, subject to stated exceptions; deployers must clearly label deepfakes and certain public-interest text. The Commission's July 2026 guidance confirms the scope and current application date. ([AI Act Articles 50 and 113](https://eur-lex.europa.eu/eli/reg/2024/1689/oj), [European Commission Article 50 guidance](https://digital-strategy.ec.europa.eu/en/policies/guidelines-transparency-ai-generated-content), [Commission Article 50 FAQ](https://digital-strategy.ec.europa.eu/en/faqs/transparency-obligations-under-article-50-ai-act))

The application's always-visible “AI-generated illustrative visualisation” label and stored provenance are prudent release requirements independent of whether a particular kitchen image meets the AI Act definition of a deepfake. Procurement should confirm that the provider supplies compliant machine-readable marking and that download/validation/storage do not strip it. Counsel must classify the application/provider as deployer/provider for the exact integration and assess any pre-2-August-2026 system transition rule.

## 6. Cookies and analytics

### 6.1 Legal facts

- TDDDG section 25(1) requires clear, comprehensive, GDPR-standard consent before information is stored in or accessed from the end user's device. Personal-data status is not required for this rule to apply. ([TDDDG section 25](https://www.gesetze-im-internet.de/ttdsg/__25.html), [DSK Telemedia Guidance, pages 6-10](https://www.datenschutzkonferenz-online.de/media/oh/20211220_oh_telemedien.pdf))
- Consent is unnecessary only where the sole purpose is transmitting a communication or where the storage/access is strictly necessary to provide the digital service expressly requested by the user. The strict-necessity test is tied to the concrete user-requested service, not the controller's business convenience. ([TDDDG section 25(2)](https://www.gesetze-im-internet.de/ttdsg/__25.html), [DSK Telemedia Guidance, pages 19-26](https://www.datenschutzkonferenz-online.de/media/oh/20211220_oh_telemedien.pdf))
- Consent-required access must not occur before consent. The DSK requires informed, specific, freely given, affirmative choice and says rejection must be possible without more click effort than acceptance where the banner blocks access. Vague purposes such as “better user experience” are insufficient. ([DSK Telemedia Guidance, pages 10-16](https://www.datenschutzkonferenz-online.de/media/oh/20211220_oh_telemedien.pdf))
- TDDDG decides whether device access/storage is permitted; any resulting processing of personal data separately needs a GDPR basis and Article 13 information. ([DSK Telemedia Guidance, pages 5 and 18-19](https://www.datenschutzkonferenz-online.de/media/oh/20211220_oh_telemedien.pdf))

### 6.2 Architecture release gate

The lowest-risk First Production Release is no optional analytics SDK and only server/security logs that are minimised, purpose-bound, access-controlled, and time-limited. If analytics is enabled:

- classify every cookie, local/session storage key, SDK, request, pixel, fingerprinting technique, and embedded third party;
- prevent non-essential code, storage, and outbound requests before opt-in;
- provide equally prominent/easy accept and reject actions plus purpose-level settings;
- make withdrawal available from every page and as easy as consent;
- record purpose/version/decision evidence without building an excessive device profile;
- propagate withdrawal to SDKs and delete/reset identifiers where applicable;
- test clean browser, accept, reject, partial choice, withdrawal, expiry, and changed-policy paths on desktop/mobile;
- ensure Quote Request, account, configurator, and AI access do not depend on optional analytics consent.

Authentication/session, locale, CSRF, consent-choice, and cart-like state can be consent-exempt only after a documented strict-necessity assessment for the expressly requested feature. Labels such as “functional” or “first party” do not create the exemption.

## 7. Personal-data breach response

### 7.1 Legal facts

- A processor must notify the controller without undue delay after becoming aware of a personal-data breach. ([GDPR Article 33(2)](https://eur-lex.europa.eu/eli/reg/2016/679/2016-05-04))
- The controller must notify the competent supervisory authority without undue delay and, where feasible, within 72 hours of awareness unless the breach is unlikely to result in a risk to natural persons' rights and freedoms. Delay must be explained; information may be supplied in phases. ([GDPR Article 33(1), (3), and (4)](https://eur-lex.europa.eu/eli/reg/2016/679/2016-05-04))
- The controller must document every personal-data breach, its effects, and remedial action sufficiently for supervisory verification, including breaches not notified. ([GDPR Article 33(5)](https://eur-lex.europa.eu/eli/reg/2016/679/2016-05-04))
- Where high risk is likely, affected people must be told without undue delay in clear language, subject to Article 34's limited exceptions. ([GDPR Article 34](https://eur-lex.europa.eu/eli/reg/2016/679/2016-05-04), [EDPB Guidelines 9/2022](https://www.edpb.europa.eu/documents/guideline/guidelines-92022-on-personal-data-breach-notification-under-gdpr_en))

### 7.2 Architecture release gate

Before launch, the team must have:

- one 24/7 intake path and named incident commander/privacy decision-maker;
- processor contracts that notify rapidly enough for the controller's 72-hour clock, with required facts and continuing updates;
- a UTC awareness timestamp and decision log;
- triage for confidentiality, integrity, and availability breaches across database, auth, email, storage, AI provider, logs, backups, and staff access;
- risk/high-risk assessment criteria and the competent German authority's submission route;
- authority and customer templates in German and other supported languages;
- preserved evidence with least access and no uncontrolled copying;
- phased-notification procedure when facts are incomplete;
- quarterly tabletop exercises and remediation tracking;
- a breach register with its own counsel-approved retention period and restricted access.

The 72-hour threshold is a notification deadline, not an incident-resolution deadline. “No confirmed exfiltration” is not by itself proof that notification risk is unlikely. Conversely, not every security event is a personal-data breach; the decision and evidence must be documented.

## 8. DPIA triggers and release decision

### 8.1 Legal facts

- Article 35(1) requires a DPIA before processing likely to result in high risk, particularly when using new technologies, considering nature, scope, context, and purposes. Article 35(3) specifically lists systematic/extensive evaluation with legal/similarly significant effects, large-scale special-category/criminal data, and systematic large-scale monitoring of public areas. ([GDPR Article 35](https://eur-lex.europa.eu/eli/reg/2016/679/art_35/oj))
- The BfDI describes a DPIA as a mandatory structured risk analysis for processing likely to create high risk and links the DSK mandatory list for private-sector processing. ([BfDI DPIA overview and lists](https://www.bfdi.bund.de/DE/Fachthemen/Inhalte/Technik/Datenschutz-Folgenabschaetzungen.html), [DSK private-sector mandatory list](https://www.bfdi.bund.de/SharedDocs/Downloads/DE/Muster/Liste_VerarbeitungsvorgaengeArt35.pdf?__blob=publicationFile&v=7))
- The DSK requires a general pre-assessment before processing personal data with AI, says a DPIA is required if high risk is likely, notes this will often occur with AI, and says the controller must obtain sufficient system information from the provider. ([DSK AI guidance, section 2.3](https://www.datenschutzkonferenz-online.de/media/oh/20240506_DSK_Orientierungshilfe_KI_und_Datenschutz.pdf))
- If a DPIA shows residual high risk that the controller cannot mitigate, prior consultation with the supervisory authority is required. ([GDPR Article 36](https://eur-lex.europa.eu/eli/reg/2016/679/2016-05-04))

### 8.2 Product-specific assessment

Ordinary account storage and a human-reviewed kitchen Quote Request do not, on the stated facts alone, match Article 35(3)'s automatic examples. A curated kitchen-image generator also is not automatically high risk merely because it uses AI. However, the combination of new AI technology, room imagery that can reveal identity/location/private life, an external provider and subprocessors, potential third-country access, provider opacity, generated personal data, and deletion difficulty requires a written screening rather than an informal “low risk” assumption.

Escalate to a full DPIA if any of the following enters scope:

- people, faces, biometrics, health/religious/political or other Article 9 content;
- free-form prompts or broad user uploads likely to contain third-party data;
- provider training/reuse or model memorisation of customer inputs/outputs;
- automated eligibility, price, fraud, ranking, or sales decisions with significant effects;
- large-scale cross-project profiling, data matching, behavioural monitoring, or personalised marketing;
- systematic observation of rooms/households or inference about residents;
- inability to fulfil access, correction, erasure, or provider-side deletion;
- material scope, provider, model, country, subprocessor, purpose, retention, or safeguard changes.

**Release gate:** complete a signed DPIA pre-screen covering data flow, people affected, purposes/bases, necessity/proportionality, threats, likelihood/severity, mitigations, provider evidence, residual risk, and review trigger. If no DPIA is done, record why high risk is not likely. If high risk is likely, complete the DPIA before activation; if residual high risk remains, do not activate before Article 36 consultation.

## 9. Consolidated privacy/compliance release gates for ticket 14

| Gate | Pass evidence | Blocking failure |
|---|---|---|
| P-01 Controller and inventory | Named legal controller/DPO; current ROPA/data-flow map for account, Project, quote, AI, analytics, email, auth, logs, storage, backups, processors | Unknown controller, purpose, recipient, data location, or deletion owner |
| P-02 Purpose/basis matrix | Approved basis for every collection, use, disclosure, archive, marketing, analytics, AI execution, and deletion-audit purpose | One generic “consent” or “legitimate interest” for the whole product |
| P-03 Quote retention | Counsel/tax-adviser classification; exact trigger/deadline/fields for open, closed, commercial-letter, tax, claims, and legal-hold states | Universal indefinite/ten-year retention; or deletion despite an identified legal duty |
| P-04 Article 13 notice | German-first notice plus supported locales; actual purposes, bases, recipients, transfers, periods, rights; immutable version archive; browser evidence before submission/generation | Placeholder periods, generic “partners,” hidden AI/transfer, forced notice consent |
| P-05 Consent | Separate purpose-level optional controls; receipt and withdrawal evidence; marketing suppression; automated expiry/re-consent policy where justified | Bundled marketing/analytics/AI; prechecked box; withdrawal harder than opt-in |
| P-06 Deletion | Tested Project/account/provider deletion including restore drill; purpose-restricted retained quote; non-personal operational audit where possible | Soft delete only; backups/providers silently resurrect data; entire Project retained for one quote |
| P-07 AI processor/transfer | Executed Article 28 DPA; role/purpose/training/retention/subprocessor map; Article 45/46 mechanism; TIA/supplementary measures; deletion test; kill switch | Customer data sent on public terms or acknowledgement alone; unknown onward transfers/training |
| P-08 AI transparency/minimisation | Pre-use disclosure; prohibited-content checks; metadata stripping; least-data payload; visible AI label; machine-readable provenance preserved; exact retention | Account/contact/note sent to model; people/documents accepted; output presented as a real/product-true photo |
| P-09 Cookies/analytics | Complete device-access inventory; no non-essential request before consent; equal reject/accept; granular choice; withdrawal and mobile tests | Analytics/pixel/storage fires on first load or after reject; consent wall for core service |
| P-10 Breach readiness | Competent-authority route, 24/7 intake, UTC clock, risk templates, processor SLA, customer templates, breach register, tabletop evidence | No owner/clock; provider terms cannot support 72-hour decision; no affected-person process |
| P-11 DPIA | Signed screening and review triggers; completed DPIA/Article 36 consultation where required | AI enabled without provider facts or written high-risk assessment |
| P-12 Ongoing review | Quarterly privacy-control review and change gate for provider/model/purpose/retention/cookie/subprocessor changes | Launch-time-only assessment; material change bypasses privacy review |

## 10. Decisions that primary sources cannot make for the project

These are not engineering guesses and should remain explicit blockers until answered:

1. **Legal controller and merchant/tax status:** Which legal entity operates the German service, and is it a merchant subject to HGB section 257?
2. **Record classification:** Is the submitted Quote Request, confirmation, sales response, configuration snapshot, or selected photo a commercial/business letter or tax-relevant document? Which exact fields comprise the legally retained record?
3. **Commercial closure:** When is a rejected, abandoned, fulfilled, or duplicate enquiry considered closed?
4. **Non-statutory period:** Is any post-closure operational/claims window necessary for enquiries that are not retained under HGB/AO? What identified claim supports it, and what is the exact deadline?
5. **Legal holds:** Who may impose/release a hold, for which material, and with what review interval?
6. **Consent bases:** Does any AI processing genuinely rely on consent, or is the first-use event an acknowledgement of Article 6(1)(b)/other processing? Marketing and analytics remain separate regardless.
7. **Provider role and transfer:** Does the AI provider act solely as processor; where does every subprocessor process; what Article 45/46 tool and supplementary measures apply; is training/reuse prohibited?
8. **Deletion-proof period:** Does counsel require an identifiable completed-deletion case for claims/accountability, and for exactly how long? If not, use only non-personal operational evidence.
9. **Competent authority:** Which German state supervisory authority is competent for the controller, and who has authority to notify it?
10. **DPIA:** Does the final AI/data flow cross the likely-high-risk threshold, based on actual volume, content, provider facts, rights handling, and safeguards?

## Primary sources

All sources were accessed on 2026-08-13.

- [Regulation (EU) 2016/679 (GDPR), consolidated text](https://eur-lex.europa.eu/eli/reg/2016/679/2016-05-04)
- [EDPB Guidelines 2/2019 on Article 6(1)(b)](https://www.edpb.europa.eu/documents/guideline/guidelines-22019-on-the-processing-of-personal-data-under-article-61b-gdpr-in_en)
- [EDPB Guidelines 9/2022 on personal-data breach notification](https://www.edpb.europa.eu/documents/guideline/guidelines-92022-on-personal-data-breach-notification-under-gdpr_en)
- [EDPB Recommendations 01/2020 on supplementary transfer measures](https://www.edpb.europa.eu/documents/recommendation/recommendations-012020-on-measures-that-supplement-transfer-tools-to_en)
- [HGB section 257](https://www.gesetze-im-internet.de/hgb/__257.html)
- [AO section 147](https://www.gesetze-im-internet.de/ao_1977/__147.html)
- [BGB section 195](https://www.gesetze-im-internet.de/bgb/__195.html)
- [BGB section 199](https://www.gesetze-im-internet.de/bgb/__199.html)
- [UWG section 7](https://www.gesetze-im-internet.de/uwg_2004/__7.html)
- [TDDDG section 25](https://www.gesetze-im-internet.de/ttdsg/__25.html)
- [DSK Short Paper 20: Consent under the GDPR](https://www.datenschutzkonferenz-online.de/media/kp/dsk_kpnr_20.pdf)
- [DSK Guidance for providers of telemedia, version 1.1](https://www.datenschutzkonferenz-online.de/media/oh/20211220_oh_telemedien.pdf)
- [DSK Guidance: Artificial intelligence and data protection, version 1.0](https://www.datenschutzkonferenz-online.de/media/oh/20240506_DSK_Orientierungshilfe_KI_und_Datenschutz.pdf)
- [BfDI DPIA overview and lists](https://www.bfdi.bund.de/DE/Fachthemen/Inhalte/Technik/Datenschutz-Folgenabschaetzungen.html)
- [LfD Niedersachsen guidance for setting deletion periods](https://www.lfd.niedersachsen.de/startseite/themen/technik_und_organisation/festlegung_von_loschfristen_im_offentlichen_bereich/hilfestellungen-fuer-verantwortliche-bei-der-festlegung-von-loeschfristen-168232.html)
- [LfD Niedersachsen Article 13/14 guidance](https://www.lfd.niedersachsen.de/dsgvo/informationspflichten_auskunftsrechte/informationspflichten-aus-art-13-und-14-ds-gvo-165813.html)
- [Regulation (EU) 2024/1689 (AI Act)](https://eur-lex.europa.eu/eli/reg/2024/1689/oj)
- [European Commission Article 50 AI Act transparency guidance](https://digital-strategy.ec.europa.eu/en/policies/guidelines-transparency-ai-generated-content)
