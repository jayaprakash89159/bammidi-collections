"""
AI Shopping Bot — Production-grade backend
==========================================
Architecture:
  - Single POST /api/bot/chat/ endpoint (stateless, history sent by client)
  - Claude claude-3-5-haiku-20241022 for intent understanding + product selection
  - Catalog built once per request with a single efficient DB query (select_related)
  - Four action types: show_products, show_categories, check_order, chat
  - Graceful fallback to rule-based engine when no API key configured
  - Cart add-to-cart is handled client-side (bot returns product IDs, frontend does the add)
"""
import json
import os
import re
import urllib.request
from django.conf import settings
from django.db.models import Q
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework import status as drf_status
from apps.products.models import Product, Category
from apps.products.serializers import ProductListSerializer


# ─── Catalog builder (single query, efficient) ───────────────────────────────

def _build_catalog() -> tuple[str, dict]:
    """
    Returns (catalog_text, category_slug_map).
    Single DB query fetching all active products with their categories.
    """
    categories = list(Category.objects.filter(is_active=True).order_by('sort_order', 'name'))
    cat_index = {c.id: c for c in categories}

    # One query: all active products + category + inventory
    products = list(
        Product.objects.filter(is_active=True)
        .select_related('category', 'inventory')
        .order_by('category__sort_order', 'name')[:150]
    )

    # Category slug map for fallback (name variations → slug)
    slug_map: dict[str, str] = {}
    cat_lines = []
    for c in categories:
        slug_map[c.name.lower()] = c.slug
        slug_map[c.slug.lower()] = c.slug
        cat_lines.append(f"  - {c.name} (slug={c.slug})")

    # Compact product catalog for Claude (minimise tokens)
    prod_lines = []
    for p in products:
        stock = "✓" if p.is_in_stock else "✗"
        cat_slug = p.category.slug if p.category else "other"
        prod_lines.append(
            f"{p.id}|{p.name}|{cat_slug}|₹{p.price}/{p.unit}|{stock}|tags:{p.tags}"
        )

    catalog = (
        "CATEGORIES:\n" + "\n".join(cat_lines) +
        "\n\nPRODUCTS [id|name|cat_slug|price|in_stock(✓/✗)|tags]:\n" +
        "\n".join(prod_lines)
    )
    return catalog, slug_map


# ─── Claude API caller ────────────────────────────────────────────────────────

def _call_claude(messages: list, system: str) -> str:
    api_key = (
        getattr(settings, 'ANTHROPIC_API_KEY', '') or
        os.environ.get('ANTHROPIC_API_KEY', '')
    )
    if not api_key:
        raise ValueError("ANTHROPIC_API_KEY not configured")

    payload = json.dumps({
        "model": "claude-3-5-haiku-20241022",
        "max_tokens": 800,
        "system": system,
        "messages": messages,
    }).encode("utf-8")

    req = urllib.request.Request(
        "https://api.anthropic.com/v1/messages",
        data=payload,
        headers={
            "x-api-key": api_key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=20) as resp:
        data = json.loads(resp.read().decode("utf-8"))
    return data["content"][0]["text"]


# ─── System prompt ────────────────────────────────────────────────────────────

BOT_SYSTEM = """\
You are HarvestBot 🛒, a warm and helpful AI shopping assistant for HarvestLink — a hyperlocal grocery delivery app.

Your job: understand what the customer wants and respond ONLY with a valid JSON object.

RESPONSE FORMAT (strict JSON, no markdown, no extra text):
{{
  "message": "Friendly reply in 1-2 sentences. Use emojis sparingly.",
  "action": "show_products" | "show_categories" | "check_order" | "chat",
  "product_ids": [integer IDs from catalog, max 12, empty [] if not show_products],
  "category_slug": "slug or null",
  "search_query": "search term or null",
  "suggestions": ["chip 1", "chip 2", "chip 3"]
}}

ACTION RULES:
- show_products  → customer asks for specific food, ingredient, category, or "cheap/discount/offer" items
- show_categories → "what do you sell", "browse", "show me everything", "categories"
- check_order    → "where is my order", "order status", "track delivery"
- chat           → greetings, "thank you", delivery time questions, general queries

PRODUCT SELECTION RULES:
- Pick ONLY product IDs that exist in the catalog below
- For category queries (vegetables, fruits, dairy…) return ALL ids in that category (up to 12)
- For specific item queries pick exact + similar matches
- Prefer in-stock (✓) products; still include out-of-stock if it's the best match, mention it
- ALWAYS suggest 3 smart follow-up chips relevant to what was asked

CATALOG:
{catalog}
"""


# ─── Product fetcher ──────────────────────────────────────────────────────────

def _fetch_products(bot_data: dict, slug_map: dict) -> list:
    action = bot_data.get("action")
    if action != "show_products":
        return []

    product_ids = bot_data.get("product_ids") or []
    category_slug = bot_data.get("category_slug")
    search_query = bot_data.get("search_query") or ""

    # 1. Specific IDs Claude chose
    if product_ids:
        id_map = {
            p.id: p for p in Product.objects.filter(
                id__in=product_ids, is_active=True
            ).select_related("category", "inventory")
        }
        # Preserve Claude's ordering
        products = [id_map[pid] for pid in product_ids if pid in id_map]
        if products:
            return products

    # 2. Category filter
    if category_slug:
        # Normalise slug (Claude sometimes returns the category name)
        slug = slug_map.get(category_slug.lower(), category_slug)
        products = list(
            Product.objects.filter(is_active=True, category__slug=slug)
            .select_related("category", "inventory")[:12]
        )
        if products:
            return products

    # 3. Full-text search fallback chain
    if search_query:
        qs = Product.objects.filter(is_active=True).select_related("category", "inventory")
        # Try exact name match first
        products = list(qs.filter(name__icontains=search_query)[:12])
        if not products:
            # Try tags
            products = list(qs.filter(tags__icontains=search_query)[:12])
        if not products:
            # Try any word in the query
            for word in search_query.split():
                if len(word) >= 3:
                    products = list(qs.filter(
                        Q(name__icontains=word) | Q(tags__icontains=word)
                    )[:12])
                    if products:
                        break
        if products:
            return products

    return []


# ─── Rule-based fallback (no API key) ────────────────────────────────────────

KEYWORD_CATEGORIES = {
    "vegetable": "vegetables", "veggie": "vegetables", "sabji": "vegetables",
    "sabzi": "vegetables", "greens": "vegetables", "tomato": "vegetables",
    "potato": "vegetables", "onion": "vegetables", "carrot": "vegetables",
    "fruit": "fruits", "apple": "fruits", "banana": "fruits", "mango": "fruits",
    "dairy": "dairy", "milk": "dairy", "curd": "dairy", "dahi": "dairy",
    "paneer": "dairy", "cheese": "dairy", "butter": "dairy", "ghee": "dairy",
    "snack": "snacks", "chips": "snacks", "biscuit": "snacks", "namkeen": "snacks",
    "rice": "grains", "atta": "grains", "flour": "grains", "dal": "grains",
    "oil": "oils", "mustard": "oils", "sunflower": "oils",
    "egg": "eggs", "meat": "meat", "chicken": "meat", "fish": "seafood",
    "juice": "beverages", "drink": "beverages", "water": "beverages",
    "soap": "personal-care", "shampoo": "personal-care",
}

def _rule_based_fallback(message: str) -> dict:
    msg = message.lower().strip()

    if any(w in msg for w in ["hi", "hello", "hey", "namaste", "hola"]):
        return {
            "message": "Hello! 👋 Welcome to HarvestLink! I'm HarvestBot — ask me about any product and I'll find it for you!",
            "action": "chat",
            "product_ids": [],
            "suggestions": ["🥦 Show vegetables", "🍎 Fresh fruits", "🛒 Browse all categories"],
        }

    if any(w in msg for w in ["order", "track", "delivery", "where is", "status"]):
        return {
            "message": "To track your order, go to My Orders in the menu. I'll help you find products in the meantime!",
            "action": "check_order",
            "product_ids": [],
            "suggestions": ["🥦 Vegetables", "🍎 Fruits", "🥛 Dairy"],
        }

    if any(w in msg for w in ["categor", "browse", "what do you", "show all", "everything"]):
        return {
            "message": "Here are all our product categories! Tap any to explore 👇",
            "action": "show_categories",
            "product_ids": [],
            "suggestions": ["🥦 Vegetables", "🍎 Fruits", "🥛 Dairy"],
        }

    for keyword, slug in KEYWORD_CATEGORIES.items():
        if keyword in msg:
            return {
                "message": f"Great choice! Here are our {keyword} products 🛒",
                "action": "show_products",
                "product_ids": [],
                "category_slug": slug,
                "search_query": None,
                "suggestions": ["Add to cart", "See other categories", "🔥 Best deals"],
            }

    return {
        "message": f"Let me search for \"{message}\" in our store!",
        "action": "show_products",
        "product_ids": [],
        "category_slug": None,
        "search_query": message,
        "suggestions": ["🥦 Vegetables", "🍎 Fruits", "🥛 Dairy products"],
    }


# ─── Main endpoint ────────────────────────────────────────────────────────────

@api_view(["POST"])
@permission_classes([AllowAny])
def bot_chat(request):
    """
    POST /api/bot/chat/
    {
      "message": "show me vegetables",
      "history": [{"role": "user"|"assistant", "content": "..."}]
    }
    """
    user_message = (request.data.get("message") or "").strip()
    history = request.data.get("history") or []

    if not user_message:
        return Response({"error": "message is required"}, status=drf_status.HTTP_400_BAD_REQUEST)

    # Build catalog (efficient single query)
    catalog_text, slug_map = _build_catalog()

    # Build conversation messages (last 6 turns for efficiency)
    messages = []
    for h in history[-6:]:
        role = h.get("role")
        content = h.get("content") or ""
        if role in ("user", "assistant") and content:
            messages.append({"role": role, "content": str(content)})
    messages.append({"role": "user", "content": user_message})

    # Try Claude AI first
    bot_data = None
    ai_used = False
    try:
        system = BOT_SYSTEM.format(catalog=catalog_text)
        raw = _call_claude(messages, system)

        # Strip any markdown fences
        raw = raw.strip()
        if "```" in raw:
            raw = re.sub(r"```[a-z]*\n?", "", raw).replace("```", "").strip()

        bot_data = json.loads(raw)
        ai_used = True
    except Exception:
        # No key or Claude error — use rule-based fallback
        bot_data = _rule_based_fallback(user_message)

    action = bot_data.get("action", "chat")

    # ── Handle show_categories ─────────────────────────────────────────────
    if action == "show_categories":
        cats = list(
            Category.objects.filter(is_active=True)
            .order_by('sort_order', 'name')
            .values("id", "name", "slug", "description")
        )
        return Response({
            "message": bot_data.get("message", "Here are all our categories!"),
            "action": "show_categories",
            "products": [],
            "categories": cats,
            "suggestions": bot_data.get("suggestions") or ["🥦 Vegetables", "🍎 Fruits", "🥛 Dairy"],
            "ai_used": ai_used,
        })

    # ── Handle check_order ─────────────────────────────────────────────────
    if action == "check_order":
        return Response({
            "message": bot_data.get("message", "You can check your order status in My Orders."),
            "action": "check_order",
            "products": [],
            "categories": [],
            "suggestions": bot_data.get("suggestions") or ["🛒 Keep shopping", "🏠 Go home"],
            "ai_used": ai_used,
        })

    # ── Handle show_products ────────────────────────────────────────────────
    products = _fetch_products(bot_data, slug_map)
    serialized = ProductListSerializer(products, many=True).data

    # If no products found but action was show_products, give helpful message
    message = bot_data.get("message", "Here's what I found!")
    if action == "show_products" and not products:
        message = "I couldn't find exact matches, but here are some popular items you might like!"
        # Return featured products as fallback
        featured = list(
            Product.objects.filter(is_active=True, is_featured=True)
            .select_related("category", "inventory")[:6]
        )
        serialized = ProductListSerializer(featured, many=True).data

    return Response({
        "message": message,
        "action": action,
        "products": serialized,
        "categories": [],
        "category_slug": bot_data.get("category_slug"),
        "search_query": bot_data.get("search_query"),
        "suggestions": bot_data.get("suggestions") or [],
        "ai_used": ai_used,
    })
