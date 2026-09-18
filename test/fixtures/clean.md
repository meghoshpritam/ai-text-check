---
title: Shipping without a vector database
description: How we raised retrieval accuracy 40% with Postgres and careful ranking instead of a dedicated vector store.
date: 2026-03-12
---

# Shipping without a vector database

I kept the retrieval path on Postgres because the existing catalog already had the filters the product needed. The first week we measured a 40% accuracy gain on the evaluation set after adding lexical fallback.

The change was boring on purpose. We logged every miss, then adjusted ranking weights. That was enough.
