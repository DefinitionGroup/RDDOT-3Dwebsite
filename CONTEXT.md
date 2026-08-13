# rotpunkt Signature

The shared domain language for the rotpunkt Signature website, kitchen configurator, saved customer work, and commercial handoff.

## Language

**First Production Release**:
The German-first release in which people can browse, configure, save and share their work, generate an AI photo, use an account, and submit a Quote Request. It contains no cart, payment, Order, payment-provider integration, or commerce-customer synchronization.
_Avoid_: MVP, launch v1

**Production Release Gate**:
The evidence-backed decision that a candidate may enter production because every applicable quality, security, privacy, data-integrity, recovery, and operational criterion has passed or carries an explicitly permitted time-limited risk acceptance.
_Avoid_: Successful build, deployment checklist, informal approval

**Release Owner**:
The named person accountable for verifying a production candidate's complete release evidence and coordinating specialist approvals. The role cannot waive a specialist rejection or a non-waivable gate.
_Avoid_: Release Manager, deployer, sole approver

**Editorial Content**:
Non-personal public-facing copy, structure, SEO inputs, and publication-ready media, including their unpublished drafts. It excludes customer, transactional, behavioral, generated-photo, confidential production-file, and executable configuration data.
_Avoid_: Customer content, application state, production asset

**Editorial Page**:
A locale-specific, independently publishable Sanity document containing one public page's editorial content, SEO inputs, and ordered Page Blocks. Linked Editorial Pages represent translations; an unavailable translation never borrows fields from another language.
_Avoid_: Route, translated field bundle, application screen

**Page Block**:
One member of the curated, versioned set of editorial compositions that may appear on an Editorial Page. Editors control its content and approved variants, while code owns its rendering, responsiveness, accessibility, and motion.
_Avoid_: Arbitrary component, free-form layout, embedded code

**Configurator Block**:
A smart Page Block containing editorial presentation and a stable `productKey`. For a new configuration, the application resolves that key to the active Release Bundle; the block never embeds executable configuration rules, numeric pricing, production asset locations, or a Product Definition Draft.
_Avoid_: Product Definition, configurator engine, Release Bundle

**Editorial Preview**:
An authorized, non-indexable view of unpublished Editorial Page content rendered with the currently active Release Bundle and with customer-facing or external side effects disabled.
_Avoid_: Public page, Product Definition preview, staging release

**Release Candidate**:
An immutable, validated but inactive combination of a Product Definition Draft snapshot, compatible Asset Manifest, and applicable Price Book Release prepared for approval and Release Candidate Preview. It cannot serve new public configurations until a Release Manager activates it as a Release Bundle.
_Avoid_: Sanity draft, published product, active release

**Release Candidate Preview**:
An authorized, non-indexable, side-effect-free view that exercises an explicit Release Candidate before activation.
_Avoid_: Editorial Preview, public configurator, draft document preview

**Release Manager**:
A separately authenticated and authorized internal role that may activate a validated and fully approved Release Candidate as a Release Bundle. Sanity editorial permission alone never grants this authority.
_Avoid_: Sanity Editor, publisher, administrator

**Product Definition**:
The versioned set of valid layouts, finish options, and configuration rules for a configurable kitchen product.
_Avoid_: Product schema, catalog item

**Product Definition Draft**:
The editable editorial proposal for a Product Definition. It may be incomplete and cannot be used by the public configurator until it becomes a Product Definition Release.
_Avoid_: Published product, live configuration

**Product Definition Release**:
An immutable, validated and portable publication of a Product Definition consumed by configurators and preserved by Configuration Revisions. A privileged Release Manager promotes it from a Product Definition Draft after required validation.
_Avoid_: Sanity document, current product

**Asset Manifest**:
An immutable versioned description of approved 3D models, textures, named scene roles, cameras, checksums, and runtime characteristics referenced by a Product Definition Release.
_Avoid_: Asset folder, arbitrary URL

**Render Specification**:
The validated visual interpretation of one Kitchen Configuration and its pinned Release Bundle, resolving semantic scene roles, material assignments, visibility, approved views, and quality policy without changing configuration meaning.
_Avoid_: Kitchen Configuration, scene graph, Product Definition Draft

**Semantic Scene Role**:
A stable product-meaning identifier assigned to configurable surfaces and important fixed elements independently of authoring-tool object names. An Asset Manifest maps each required role to explicit production nodes and material slots.
_Avoid_: Mesh name, material index, heuristic match

**Studio Scene**:
The canonical controlled environment for comparing the product geometry and selected finishes. Atmospheric scenes may supplement it but cannot replace or contradict it.
_Avoid_: Lifestyle scene, marketing render, room configuration

**Deterministic Visual Fallback**:
An approved non-interactive representation used when stable 3D is unavailable. It preserves configuration tasks and clearly distinguishes exact raster coverage from an illustrative layout or material composition.
_Avoid_: Broken canvas, heuristic rendering, approximate exact view

**Quality Profile**:
An approved rendering-fidelity level selected from runtime capability and stability. It may change geometric detail and visual effects but cannot change selectable parts, silhouette, finish identity, visibility, or configuration meaning.
_Avoid_: Device type, screen size, product variant

**Price Book Release**:
An immutable, application-owned and commercially approved set of numeric pricing inputs used by the Pricing Module. It may later originate from a commerce or ERP Adapter but is never authored in Sanity.
_Avoid_: Sanity price, Quote, cart price

**Release Bundle**:
An atomically activated combination of one Product Definition Release, its compatible Asset Manifest, and, when numeric pricing is available, one Price Book Release. A Kitchen Configuration remains pinned to its Release Bundle until an explicit migration.
_Avoid_: Current Sanity document, latest product, live defaults

**Price Indication**:
A nonbinding customer-facing amount calculated from a Kitchen Configuration and a specific Price Book Release. It is not an Authoritative Quote or an Order total.
_Avoid_: Price, Quote, checkout total

**Authoritative Quote**:
A commercially binding or formally approved offer issued by a future designated CRM, ERP, or commerce system. It is outside the First Production Release and is distinct from both a Price Indication and a Quote Request.
_Avoid_: Price Indication, Quote Request, checkout total

**Accepted Quote Payment**:
A later paid Sales Mode in which a customer pays an approved amount from an accepted Authoritative Quote through a narrow Payment Adapter. It cannot originate from a Price Indication or Quote Request and does not imply cart, catalog, inventory, or direct-purchase capabilities.
_Avoid_: Configurator checkout, Quote Request payment, cart checkout

**Payment Handoff Snapshot**:
An immutable record of the exact accepted Authoritative Quote revision, Configuration Revision reference, approved amount, currency, tax context, expiry, payment purpose, Customer Account reference, and provenance used to initiate an Accepted Quote Payment. Live configuration or pricing data cannot mutate it.
_Avoid_: Cart total, current configuration, live quote

**Payment Attempt**:
The application-owned, idempotently created operational record that links one Payment Handoff Snapshot to opaque payment-provider references and its reconciled Payment Status. It is not a financial ledger or an Order.
_Avoid_: Payment intent, checkout session, Order

**Payment Adapter**:
The server-only boundary used by the `AcceptedQuotePayment` Module to initiate provider-hosted payment, retrieve provider facts, and perform approved refund or reconciliation operations. Provider types and financial credentials do not cross it.
_Avoid_: Commerce gateway, client SDK, payment database

**Kitchen Configuration**:
A normalized, shareable selection of the available kitchen layout and finish options pinned to a specific Release Bundle.
_Avoid_: Cart, order, design

**Guest Configuration**:
A shareable Kitchen Configuration that is not owned by a Customer Account and may be imported as a copy after sign-in.
_Avoid_: Anonymous account, guest order, claimed configuration

**Customer Account**:
The application-owned identity and private workspace of a person planning their own kitchen. Authentication Identities grant access, while Sanity editors and future internal sales or planning staff remain separate identities.
_Avoid_: User account, editor account, Shopify customer

**Authentication Identity**:
A provider-issued identity linked to one Customer Account for sign-in; it never owns Projects or commercial data.
_Avoid_: Customer, account owner, provider user

**Identity Adapter**:
The server-only boundary that verifies a Better Auth session, requires recent authentication, revokes sessions, and deletes an Authentication Identity before resolving it to a Customer Account. Domain authorization never consumes Better Auth IDs or session types directly.
_Avoid_: Auth context, user provider, account repository

**Configuration Import**:
The idempotent creation of a new Project from a Guest Configuration after verified sign-in; it copies configuration state rather than transferring exclusive ownership. A later deliberate import may create another Project, while retrying the same import operation may not.
_Avoid_: Claim, account merge

**Project**:
A Customer Account's durable planning workspace containing named Configuration Revisions, generated photos, notes, and Quote Requests.
_Avoid_: Saved configuration, cart

**Project Metadata**:
The mutable private name and notes used to organize a Project. Project Metadata is not part of the Kitchen Configuration, its revision hash, or a Shared Revision Link.
_Avoid_: Configuration fields, shared description

**Working Configuration**:
The single mutable, persistently saved Kitchen Configuration currently being edited inside a Project; meaningful milestones become Configuration Revisions.
_Avoid_: Draft order, revision

**Configuration Revision**:
An immutable, deduplicated milestone snapshot of a Kitchen Configuration within a Project that preserves the Product Definition version and display data needed to understand it historically. Shared Revision Links, Generated Photos, and Quote Requests refer to Configuration Revisions; autosave changes only the Working Configuration.
_Avoid_: Autosave, cart line

**Archived Project**:
A Project removed from the active workspace and made read-only until restored. It remains fully recoverable by its owner, and its existing Shared Revision Links remain available.
_Avoid_: Deleted Project, Trash

**Trashed Project**:
A Project blocked from further activity and scheduled for permanent deletion after a 30-day recovery period unless its owner restores or permanently deletes it sooner. Entering Trash permanently revokes its Shared Revision Links.
_Avoid_: Archived Project, soft-deleted Project

**Shared Revision Link**:
A revocable, unguessable, read-only link fixed to one Configuration Revision. It expires after 90 days unless renewed and exposes no Project Metadata, Customer Account data, or Quote Requests.
_Avoid_: Shared project, collaboration link

**Generated Photo**:
A persistently stored illustrative AI-rendered image associated with the Configuration Revision that produced it. It may provide visual context but cannot establish product or commercial truth.
_Avoid_: Provider output, temporary preview, product evidence

**Source Capture**:
An immutable, validated image of a rendered Configuration Revision used as untrusted visual input for one or more Photo Jobs. It is neither the Kitchen Configuration nor commercial proof and may later be produced by a deterministic renderer instead of the customer's browser.
_Avoid_: Generated Photo, configuration record, product evidence

**Photo Job**:
An application-owned asynchronous request to create one Generated Photo from an exact Configuration Revision and Source Capture. It belongs to the owning Project, survives browser closure, and is successful only after validated output is safely persisted.
_Avoid_: Provider prediction, HTTP request, temporary generation

**Scene Preset**:
An approved customer-selectable description of the environment and atmosphere requested for a Photo Job. It supplies no product facts and is not a free-form prompt.
_Avoid_: Prompt, room configuration, Product Definition

**Prompt Template Release**:
An immutable approved version of the instructions that combine a Scene Preset with trusted facts from a Release Bundle for a Photo Job. Provider-expanded text is not part of it and cannot become product truth.
_Avoid_: Customer prompt, provider prompt, Product Definition

**Model Release**:
An immutable approved description of the exact image-generation model or deployment version, license, input and output expectations, safety behavior, pricing basis, and evaluation evidence permitted for Photo Jobs.
_Avoid_: Latest model, provider model name, Prompt Template Release

**Quote Request**:
A person's immutable, idempotently submitted request for commercial review of one Configuration Revision, including the contact, consent, note, selected photo, and nonbinding price context captured at submission. It is neither an authoritative price nor an Order.
_Avoid_: Checkout, order, purchase

**Sales Mode**:
The commercial handoffs permitted by a Product Definition Release, such as Quote Request, deposit against an accepted Authoritative Quote, or direct purchase of a Standardized Product.
_Avoid_: Checkout type, payment mode

**Sellable Offer**:
A commercially and operationally approved proposition that may enter a paid Sales Mode, with defined price authority, tax, payment, fulfillment, refund, support, and responsible ownership.
_Avoid_: Product Definition, Price Indication, marketing offer

**Standardized Product**:
An independently purchasable product with deterministic SKU, price, availability, tax, delivery, and returns behavior. A configured kitchen is not a Standardized Product merely because it has a Product Definition.
_Avoid_: Product Definition, configuration variant, custom kitchen

**Commerce Customer Link**:
The application-owned association between a Customer Account and an external commerce customer or billing profile. It uses an opaque provider reference and never transfers account or Project ownership.
_Avoid_: Customer Account, identity merge, Shopify account

**Payment Status**:
The customer-facing, reconciled view of a provider-owned transaction state. It is established from verified provider facts, never from a browser redirect, and is not a separate financial ledger.
_Avoid_: Order status, redirect result, local payment truth

**Retail Commerce Module**:
A future capability boundary for direct sale of Standardized Products, including merchant-operated catalog, inventory, cart, checkout, retail Orders, fulfillment, and returns. It remains separate from Accepted Quote Payment and cannot own Customer Accounts, Projects, Configuration Revisions, or Release Bundles.
_Avoid_: Configurator Module, Payment Adapter, universal Commerce Gateway
