// Olight Україна — all site scripts in one file (classic script, works from file://).
// Each section below is one feature; everything runs inside one closure to keep globals clean.
(() => {
    'use strict';

    // ==========================================================================
    // slider
    // ==========================================================================

    // Scroll-based sliders: arrows scroll by one item, progress bar mirrors the scroll position.
    function getStep(track) {
        const item = track.firstElementChild;
        if (!item) {
            return track.clientWidth;
        }
        const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
        return item.getBoundingClientRect().width + gap;
    }

    function setupSlider(slider) {
        const track = slider.querySelector('[data-js="slider-track"]');
        if (!track) {
            return;
        }
        const prev = slider.querySelector('[data-js="slider-prev"]');
        const next = slider.querySelector('[data-js="slider-next"]');
        const progress = slider.querySelector('[data-js="slider-progress"]');

        const update = () => {
            const maxScroll = track.scrollWidth - track.clientWidth;
            if (progress) {
                const size = track.scrollWidth ? (track.clientWidth / track.scrollWidth) * 100 : 100;
                const start = maxScroll > 0 ? (track.scrollLeft / maxScroll) * (100 - size) : 0;
                progress.style.setProperty('--progress-size', `${size}%`);
                progress.style.setProperty('--progress-start', `${start}%`);
            }
            if (prev) {
                prev.setAttribute('aria-disabled', String(track.scrollLeft <= 1));
            }
            if (next) {
                next.setAttribute('aria-disabled', String(track.scrollLeft >= maxScroll - 1));
            }
        };

        prev?.addEventListener('click', () => track.scrollBy({ left: -getStep(track) }));
        next?.addEventListener('click', () => track.scrollBy({ left: getStep(track) }));
        track.addEventListener('scroll', update, { passive: true });
        window.addEventListener('resize', update);

        const startIndex = Number(slider.dataset.sliderStart);
        if (startIndex) {
            // Center the gap between item[startIndex] and item[startIndex + 1], as in the Figma layout.
            const item = track.children[startIndex];
            if (item) {
                const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
                const behavior = track.style.scrollBehavior;
                track.style.scrollBehavior = 'auto';
                track.scrollLeft = item.offsetLeft + item.offsetWidth + gap / 2 - track.clientWidth / 2;
                track.style.scrollBehavior = behavior;
            }
        }
        update();
    }

    function initSliders() {
        document.querySelectorAll('[data-js="slider"]').forEach(setupSlider);
    }

    // ==========================================================================
    // scroll-lock
    // ==========================================================================

    const lockReasons = new Set();

    function lockScroll(reason) {
        lockReasons.add(reason);
        document.body.classList.add('is-locked');
    }

    function unlockScroll(reason) {
        lockReasons.delete(reason);
        if (lockReasons.size === 0) {
            document.body.classList.remove('is-locked');
        }
    }

    // ==========================================================================
    // drawer
    // ==========================================================================

    // Off-canvas panels (burger menu, mobile filters): Esc, overlay click, focus trap, scroll lock.
    const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), summary, [tabindex]:not([tabindex="-1"])';
    const desktop = window.matchMedia('(min-width: 1024px)');

    function setupDrawer(drawer) {
        const openClass = drawer.dataset.openClass;
        const openers = document.querySelectorAll(`[data-js="drawer-open"][aria-controls="${drawer.id}"]`);
        if (!openClass || openers.length === 0) {
            return;
        }
        let lastOpener = null;

        const isOpen = () => drawer.classList.contains(openClass);

        const close = () => {
            if (!isOpen()) {
                return;
            }
            drawer.classList.remove(openClass);
            openers.forEach((opener) => opener.setAttribute('aria-expanded', 'false'));
            unlockScroll(drawer.id);
            lastOpener?.focus();
        };

        const open = (opener) => {
            lastOpener = opener;
            drawer.classList.add(openClass);
            openers.forEach((item) => item.setAttribute('aria-expanded', 'true'));
            lockScroll(drawer.id);
            drawer.querySelector(FOCUSABLE)?.focus();
        };

        openers.forEach((opener) => opener.addEventListener('click', () => open(opener)));
        drawer.querySelectorAll('[data-js="drawer-close"]').forEach((button) => button.addEventListener('click', close));

        drawer.addEventListener('keydown', (event) => {
            if (!isOpen()) {
                return;
            }
            if (event.key === 'Escape') {
                close();
                return;
            }
            if (event.key !== 'Tab') {
                return;
            }
            const focusable = [...drawer.querySelectorAll(FOCUSABLE)].filter((element) => element.offsetParent !== null);
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        });

        desktop.addEventListener('change', (event) => {
            if (event.matches) {
                close();
            }
        });
    }

    function initDrawers() {
        document.querySelectorAll('[data-js="drawer"]').forEach(setupDrawer);
    }

    // ==========================================================================
    // sort
    // ==========================================================================

    // Sorting dropdown as an accessible listbox. Frontend demo: only the label changes.
    function setupSort(sort) {
        const toggle = sort.querySelector('[data-js="sort-toggle"]');
        const list = sort.querySelector('[data-js="sort-list"]');
        const value = sort.querySelector('[data-js="sort-value"]');
        const options = [...list.querySelectorAll('[role="option"]')];

        const close = (focusToggle = false) => {
            list.hidden = true;
            toggle.setAttribute('aria-expanded', 'false');
            if (focusToggle) {
                toggle.focus();
            }
        };

        const open = () => {
            list.hidden = false;
            toggle.setAttribute('aria-expanded', 'true');
            (options.find((option) => option.getAttribute('aria-selected') === 'true') || options[0]).focus();
        };

        const select = (option) => {
            // Options with data-href (blog categories) navigate instead of sorting.
            if (option.dataset.href) {
                window.location.href = option.dataset.href;
                return;
            }
            options.forEach((item) => item.setAttribute('aria-selected', String(item === option)));
            value.textContent = option.textContent;
            close(true);
        };

        toggle.addEventListener('click', () => (list.hidden ? open() : close()));
        list.addEventListener('click', (event) => {
            const option = event.target.closest('[role="option"]');
            if (option) {
                select(option);
            }
        });
        list.addEventListener('keydown', (event) => {
            const index = options.indexOf(document.activeElement);
            if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                event.preventDefault();
                const step = event.key === 'ArrowDown' ? 1 : -1;
                options[(index + step + options.length) % options.length].focus();
            } else if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                if (index !== -1) {
                    select(options[index]);
                }
            } else if (event.key === 'Escape' || event.key === 'Tab') {
                close(event.key === 'Escape');
            }
        });
        document.addEventListener('click', (event) => {
            if (!sort.contains(event.target)) {
                close();
            }
        });
    }

    function initSort() {
        document.querySelectorAll('[data-js="sort"]').forEach(setupSort);
    }

    // ==========================================================================
    // range
    // ==========================================================================

    // Dual price slider synced with the "від / до" number fields.
    function setupRange(range) {
        const from = range.querySelector('[data-js="range-from"]');
        const to = range.querySelector('[data-js="range-to"]');
        const fromField = range.querySelector('[data-js="range-from-field"]');
        const toField = range.querySelector('[data-js="range-to-field"]');
        const slider = range.querySelector('[data-js="range-slider"]');
        const min = Number(from.min);
        const max = Number(from.max);

        const percent = (value) => ((value - min) / (max - min)) * 100;

        const render = () => {
            slider.style.setProperty('--range-from', `${percent(Number(from.value))}%`);
            slider.style.setProperty('--range-to', `${percent(Number(to.value))}%`);
            fromField.value = from.value;
            toField.value = to.value;
        };

        from.addEventListener('input', () => {
            from.value = Math.min(Number(from.value), Number(to.value));
            render();
        });
        to.addEventListener('input', () => {
            to.value = Math.max(Number(to.value), Number(from.value));
            render();
        });
        fromField.addEventListener('change', () => {
            const value = Math.min(Math.max(Number(fromField.value) || min, min), Number(to.value));
            from.value = value;
            render();
        });
        toField.addEventListener('change', () => {
            const value = Math.max(Math.min(Number(toField.value) || max, max), Number(from.value));
            to.value = value;
            render();
        });
        render();
    }

    function initRanges() {
        document.querySelectorAll('[data-js="range"]').forEach(setupRange);
    }

    // ==========================================================================
    // search
    // ==========================================================================

    // Demo catalogue for the frontend-only search; replace with a backend request.
    const DEMO_PRODUCTS = [
        { title: 'Ліхтар Olight Oclip Pro White', price: '2 280', image: 'assets/images/products/product-1-223.webp' },
        { title: 'Ліхтар Olight I3T EOS Black', price: '1 970', image: 'assets/images/products/product-2-223.webp' },
        { title: 'Кріплення до ліхтаря Olight Holster Fixing Bracket compatible with the Seeker 4 Pro holster', price: '1 460', image: 'assets/images/products/product-3-223.webp' },
        { title: 'Ліхтар Olight Oclip Pro S Sunken Artifact', price: '1 100', image: 'assets/images/products/product-4-223.webp' },
        { title: 'Ліхтар Olight Perun 3 Mini CW', price: '2 150', image: 'assets/images/products/product-6-223.webp' },
        { title: 'Ліхтар Olight Baton 4 Fighter Pilot', price: '3 560', image: 'assets/images/products/product-7-223.webp' },
        { title: 'Ліхтар Olight Oclip Pro White', price: '7 290', image: 'assets/images/products/product-5-223.webp' },
        { title: 'Ліхтар Olight Oclip Pro White', price: '1 080', image: 'assets/images/products/product-8-223.webp' },
    ];
    const MAX_RESULTS = 6;

    function highlight(text, query) {
        const fragment = document.createDocumentFragment();
        const index = text.toLowerCase().indexOf(query.toLowerCase());
        if (index === -1) {
            fragment.append(text);
            return fragment;
        }
        const mark = document.createElement('mark');
        mark.className = 'search__match';
        mark.textContent = text.slice(index, index + query.length);
        fragment.append(text.slice(0, index), mark, text.slice(index + query.length));
        return fragment;
    }

    function renderItem(product, query) {
        const item = document.createElement('li');
        const link = document.createElement('a');
        link.className = 'search__item';
        link.href = 'product.html';

        const image = document.createElement('img');
        image.className = 'search__thumb';
        image.src = product.image;
        image.width = 40;
        image.height = 40;
        image.alt = '';
        image.loading = 'lazy';

        const info = document.createElement('span');
        info.className = 'search__info';
        const name = document.createElement('span');
        name.className = 'search__name';
        name.append(highlight(product.title, query));
        const price = document.createElement('span');
        price.className = 'search__price';
        price.textContent = `${product.price} ₴`;
        info.append(name, price);

        link.append(image, info);
        item.append(link);
        return item;
    }

    function initSearch() {
        const panel = document.querySelector('[data-js="search"]');
        const toggles = document.querySelectorAll('[data-js="search-toggle"]');
        if (!panel || toggles.length === 0) {
            return;
        }
        const form = panel.querySelector('[data-js="search-form"]');
        const input = panel.querySelector('[data-js="search-input"]');
        const clear = panel.querySelector('[data-js="search-clear"]');
        const closeButton = panel.querySelector('[data-js="search-close"]');
        const results = panel.querySelector('[data-js="search-results"]');
        const list = panel.querySelector('[data-js="search-list"]');
        const allLink = panel.querySelector('[data-js="search-all"]');
        const isMobile = window.matchMedia('(max-width: 1023.98px)');
        let lastToggle = null;

        const render = () => {
            const query = input.value.trim();
            clear.hidden = query === '';
            list.replaceChildren();
            if (query.length < 2) {
                results.hidden = true;
                return;
            }
            const found = DEMO_PRODUCTS.filter((product) => product.title.toLowerCase().includes(query.toLowerCase()));
            if (found.length === 0) {
                const empty = document.createElement('li');
                empty.className = 'search__empty';
                empty.textContent = 'Нічого не знайдено';
                list.append(empty);
            } else {
                found.slice(0, MAX_RESULTS).forEach((product) => list.append(renderItem(product, query)));
            }
            allLink.href = `catalog.html?q=${encodeURIComponent(query)}`;
            results.hidden = false;
        };

        const setExpanded = (value) => toggles.forEach((toggle) => toggle.setAttribute('aria-expanded', String(value)));

        const close = () => {
            if (panel.hidden) {
                return;
            }
            panel.hidden = true;
            setExpanded(false);
            unlockScroll('search');
            lastToggle?.focus();
        };

        const open = (toggle) => {
            lastToggle = toggle;
            panel.hidden = false;
            setExpanded(true);
            if (isMobile.matches) {
                lockScroll('search');
            }
            input.focus();
        };

        toggles.forEach((toggle) => toggle.addEventListener('click', () => (panel.hidden ? open(toggle) : close())));
        closeButton.addEventListener('click', close);
        input.addEventListener('input', render);
        clear.addEventListener('click', () => {
            input.value = '';
            render();
            input.focus();
        });
        form.addEventListener('submit', (event) => {
            if (input.value.trim() === '') {
                event.preventDefault();
                input.focus();
            }
        });
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                close();
            }
        });
        document.addEventListener('click', (event) => {
            if (!panel.hidden && !isMobile.matches && !event.target.closest('[data-js="header"]')) {
                close();
            }
        });
    }

    // ==========================================================================
    // cart
    // ==========================================================================

    // Cart popup and its state. Frontend demo: items live in localStorage, checkout is a plain link.
    // Item: { key, id, title, href, image, code, model, color, price, oldPrice, qty, available, engraving }
    // engraving: { type: 'text' | 'image', text?, font?, lang?, file?, price }
    const CART_KEY = 'olight-cart';
    const FREE_DELIVERY_FROM = 3000; // UAH, "Безкоштовно від 3000 ₴" in the checkout design

    const formatMoney = (value) => `${String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} ₴`;
    const parseMoney = (text) => Number(String(text || '').replace(/[^\d]/g, '')) || 0;
    const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    })[char]);

    function readCart() {
        try {
            const items = JSON.parse(localStorage.getItem(CART_KEY));
            // Carts saved before the switch to WebP-only images still point to .jpg/.png
            return Array.isArray(items)
                ? items.map((item) => ({ ...item, image: String(item.image || '').replace(/\.(jpe?g|png)$/, '.webp') }))
                : [];
        } catch {
            return [];
        }
    }

    let cartItems = readCart();

    function saveCart() {
        try {
            localStorage.setItem(CART_KEY, JSON.stringify(cartItems));
        } catch {
            // Storage can be unavailable (private mode); the cart still works until the page is reloaded.
        }
    }

    // Demo order from the Figma mockup: open any page with ?cart=demo
    const DEMO_CART = [
        { key: 'i3t-eos-black', id: 'i3t-eos-black', title: 'Ліхтар Olight I3T EOS Black', href: 'product.html', image: 'assets/images/product/model-2-120.webp', code: '1693', model: 'Green CW', color: 'Olive Green CW', price: 11480, oldPrice: 14200, qty: 1, available: false, engraving: { type: 'text', text: 'З днем народження', font: 'Montserrat', lang: 'Кирилиця', price: 350 } },
        { key: 'oclip-pro-white', id: 'oclip-pro-white', title: 'Ліхтар Olight Oclip Pro White', href: 'product.html', image: 'assets/images/product/model-3-120.webp', code: '31175', model: 'Green CW', color: 'Olive Green CW', price: 1520, oldPrice: 0, qty: 2, available: true, engraving: { type: 'image', file: 'img.jpg', price: 400 } },
        { key: 'arkpro', id: 'arkpro', title: 'ArkPro Series – Flat Unibody EDC Flashlight with Multi-Light Sources', href: 'product.html', image: 'assets/images/product/model-3-120.webp', code: '1693', model: 'Green CW', color: 'Olive Green CW', price: 1000, oldPrice: 0, qty: 4, available: true, engraving: null },
    ];

    function cartCount() {
        return cartItems.reduce((sum, item) => sum + item.qty, 0);
    }

    function renderCartCounter() {
        const count = cartCount();
        document.querySelectorAll('[data-js="cart-counter"]').forEach((counter) => {
            counter.textContent = String(count);
            counter.hidden = count === 0;
        });
        // Product cards show the "in cart" state for products that are already in the cart.
        document.querySelectorAll('[data-product]').forEach((card) => {
            const button = card.querySelector('[data-js="cart-add"]');
            if (button) {
                const inCart = cartItems.some((item) => item.id === card.dataset.product);
                button.setAttribute('aria-pressed', String(inCart));
                button.setAttribute('aria-label', inCart ? 'Товар у кошику' : 'Додати в кошик');
            }
        });
    }

    function engravingHtml(item, index) {
        const engraving = item.engraving;
        if (!engraving) {
            return '';
        }
        const rows = engraving.type === 'text'
            ? [['Текст:', engraving.text], ['Шрифт:', engraving.font], ['Мова:', engraving.lang], ['Вартість:', formatMoney(engraving.price)]]
            : [['Файл:', engraving.file], ['Вартість:', formatMoney(engraving.price)]];
        return `
            <details class="cart-item__engraving">
                <summary class="cart-item__engraving-title">Гравіювання: ${engraving.type === 'text' ? 'текст' : 'малюнок'}<svg class="cart-item__engraving-chevron" width="16" height="16" aria-hidden="true"><use href="#icon-chevron-down"></use></svg></summary>
                <dl class="cart-item__props cart-item__props--engraving">
                    ${rows.map(([name, value]) => `<div class="cart-item__prop"><dt class="cart-item__prop-name">${name}</dt><dd class="cart-item__prop-value">${escapeHtml(value)}</dd></div>`).join('')}
                </dl>
                <div class="cart-item__engraving-actions">
                    <a class="cart-item__edit" href="${escapeHtml(item.href)}"><svg width="16" height="16" aria-hidden="true"><use href="#icon-pencil"></use></svg>Редагувати</a>
                    <button class="cart-item__engraving-remove" type="button" aria-label="Видалити гравіювання" data-js="cart-engraving-remove" data-index="${index}"><svg width="16" height="16" aria-hidden="true"><use href="#icon-trash"></use></svg></button>
                </div>
            </details>`;
    }

    function itemHtml(item, index) {
        const sale = item.oldPrice > item.price;
        const props = [['Модель:', item.model], ['Колір:', item.color]].filter(([, value]) => value);
        return `
        <li class="cart__item">
            <article class="cart-item${item.available ? '' : ' cart-item--unavailable'}">
                <div class="cart-item__main">
                    <img class="cart-item__image" src="${escapeHtml(item.image)}" width="50" height="50" alt="">
                    <div class="cart-item__content">
                        <div class="cart-item__top">
                            <div class="cart-item__info">
                                <p class="cart-item__code">Код товару: ${escapeHtml(item.code)}</p>
                                <h3 class="cart-item__title"><a class="cart-item__link" href="${escapeHtml(item.href)}">${escapeHtml(item.title)}</a></h3>
                                ${props.length ? `<dl class="cart-item__props">${props.map(([name, value]) => `<div class="cart-item__prop"><dt class="cart-item__prop-name">${name}</dt><dd class="cart-item__prop-value">${escapeHtml(value)}</dd></div>`).join('')}</dl>` : ''}
                            </div>
                            <div class="cart-item__numbers">
                                <p class="cart-item__price price price--cart${sale ? ' price--sale' : ''}">
                                    ${sale ? `<span class="visually-hidden">Стара ціна:</span><s class="price__old">${formatMoney(item.oldPrice)}</s>` : ''}
                                    <span class="visually-hidden">Ціна:</span><span class="price__current">${formatMoney(item.price)}</span>
                                </p>
                                <div class="cart-item__counter counter counter--small">
                                    <button class="counter__button" type="button" aria-label="Зменшити кількість" data-js="cart-minus" data-index="${index}"${item.qty <= 1 ? ' disabled' : ''}><svg width="16" height="16" aria-hidden="true"><use href="#icon-minus"></use></svg></button>
                                    <input class="counter__input" type="text" inputmode="numeric" value="${item.qty}" aria-label="Кількість: ${escapeHtml(item.title)}" data-js="cart-qty" data-index="${index}">
                                    <button class="counter__button" type="button" aria-label="Збільшити кількість" data-js="cart-plus" data-index="${index}"${item.qty >= 99 ? ' disabled' : ''}><svg width="16" height="16" aria-hidden="true"><use href="#icon-plus"></use></svg></button>
                                </div>
                                <p class="cart-item__sum"><span class="visually-hidden">Сума:</span>${formatMoney(item.price * item.qty)}</p>
                            </div>
                        </div>
                        ${engravingHtml(item, index)}
                    </div>
                    <button class="cart-item__remove" type="button" aria-label="Видалити ${escapeHtml(item.title)} з кошика" data-js="cart-remove" data-index="${index}"><svg width="18" height="18" aria-hidden="true"><use href="#icon-trash"></use></svg></button>
                </div>
                ${item.available ? '' : '<p class="cart-item__notice">Немає в наявності, його не буде включено в замовлення.</p>'}
            </article>
        </li>`;
    }

    function renderCart() {
        const cart = document.querySelector('[data-js="cart"]');
        renderCartCounter();
        if (!cart) {
            return;
        }
        const empty = cartItems.length === 0;
        cart.querySelector('[data-js="cart-empty"]').hidden = !empty;
        cart.querySelector('[data-js="cart-order"]').hidden = empty;
        if (empty) {
            cart.querySelector('[data-js="cart-bar"]').hidden = true;
            return;
        }

        // Unavailable items stay visible but are not part of the order.
        const ordered = cartItems.filter((item) => item.available);
        const goods = ordered.reduce((sum, item) => sum + item.price * item.qty, 0);
        const engraving = ordered.reduce((sum, item) => sum + (item.engraving ? item.engraving.price * item.qty : 0), 0);
        const discount = ordered.reduce((sum, item) => sum + Math.max(0, item.oldPrice - item.price) * item.qty, 0);
        const pay = goods + engraving;
        const left = FREE_DELIVERY_FROM - pay;

        cart.querySelector('[data-js="cart-list"]').innerHTML = cartItems.map(itemHtml).join('');
        cart.querySelector('[data-js="cart-goods"]').textContent = formatMoney(goods);
        cart.querySelector('[data-js="cart-engraving"]').textContent = formatMoney(engraving);
        const discountValue = cart.querySelector('[data-js="cart-discount"]');
        discountValue.textContent = discount ? `-${formatMoney(discount)}` : formatMoney(0);
        discountValue.classList.toggle('cart__total-value--zero', !discount);
        cart.querySelector('[data-js="cart-pay"]').textContent = formatMoney(pay);
        cart.querySelector('[data-js="cart-delivery-title"]').textContent = left > 0 ? `Замовте ще на ${formatMoney(left)}` : 'Безкоштовна доставка';
        cart.querySelector('[data-js="cart-delivery-note"]').textContent = left > 0
            ? 'Та отримайте безкоштовну доставку до відділення поштових служб'
            : 'Ваше замовлення буде доставлено до відділення поштових служб безкоштовно';
    }

    function changeCart(mutate) {
        mutate();
        saveCart();
        renderCart();
    }

    function addToCart(product, quantity = 1) {
        changeCart(() => {
            const existing = cartItems.find((item) => item.key === product.key);
            if (existing) {
                existing.qty = Math.min(99, existing.qty + quantity);
            } else {
                cartItems.push({ available: true, engraving: null, oldPrice: 0, ...product, qty: Math.min(99, quantity) });
            }
        });
    }

    // Stable demo "product code" for products that do not carry one in the markup.
    function demoCode(id) {
        let hash = 0;
        for (const char of id) {
            hash = (hash * 31 + char.charCodeAt(0)) % 90000;
        }
        return String(10000 + hash);
    }

    function productFromCard(card) {
        const image = card.querySelector('.product-card__image');
        const id = card.dataset.product || card.querySelector('.product-card__link')?.textContent.trim() || 'product';
        return {
            key: id,
            id,
            title: card.querySelector('.product-card__link')?.textContent.trim() || '',
            href: card.querySelector('.product-card__link')?.getAttribute('href') || 'product.html',
            image: image?.currentSrc || image?.getAttribute('src') || '',
            code: demoCode(id),
            price: parseMoney(card.querySelector('.price__current')?.textContent),
            oldPrice: parseMoney(card.querySelector('.price__old')?.textContent),
        };
    }

    // ----- popup -----
    let cartOpener = null;

    function cartFocusable(cart) {
        return [...cart.querySelectorAll(FOCUSABLE)].filter((element) => element.offsetParent !== null);
    }

    function updateCartBar(cart) {
        const bar = cart.querySelector('[data-js="cart-bar"]');
        const actions = cart.querySelector('[data-js="cart-actions"]');
        const body = cart.querySelector('[data-js="cart-body"]');
        if (desktop.matches || cart.hidden || !actions || actions.offsetParent === null) {
            bar.hidden = true;
            return;
        }
        // Mobile: keep "Оформити замовлення" reachable while the order buttons are out of view.
        const bodyRect = body.getBoundingClientRect();
        const rect = actions.getBoundingClientRect();
        bar.hidden = rect.top < bodyRect.bottom && rect.bottom > bodyRect.top;
    }

    function openCart(opener = document.activeElement) {
        const cart = document.querySelector('[data-js="cart"]');
        if (!cart) {
            return;
        }
        cartOpener = opener;
        renderCart();
        cart.hidden = false;
        lockScroll('cart');
        document.querySelectorAll('[data-js="cart-open"]').forEach((button) => button.setAttribute('aria-expanded', 'true'));
        requestAnimationFrame(() => {
            cart.classList.add('cart--open');
            cart.querySelector('[data-js="cart-dialog"]').focus();
            updateCartBar(cart);
            // Sliders inside the popup were measured while it was hidden: let them recalculate.
            window.dispatchEvent(new Event('resize'));
        });
    }

    function closeCart() {
        const cart = document.querySelector('[data-js="cart"]');
        if (!cart || cart.hidden) {
            return;
        }
        cart.classList.remove('cart--open');
        cart.hidden = true;
        unlockScroll('cart');
        document.querySelectorAll('[data-js="cart-open"]').forEach((button) => button.setAttribute('aria-expanded', 'false'));
        cartOpener?.focus?.();
    }

    function initCart() {
        if (new URLSearchParams(window.location.search).get('cart') === 'demo') {
            cartItems = DEMO_CART.map((item) => ({ ...item, engraving: item.engraving && { ...item.engraving } }));
            saveCart();
        }
        renderCart();

        const cart = document.querySelector('[data-js="cart"]');
        document.querySelectorAll('[data-js="cart-open"]').forEach((button) => {
            button.setAttribute('aria-controls', 'cart');
            button.setAttribute('aria-expanded', 'false');
            button.addEventListener('click', () => openCart(button));
        });
        if (!cart) {
            return;
        }

        cart.addEventListener('click', (event) => {
            const target = event.target.closest('[data-js]');
            if (!target) {
                return;
            }
            const index = Number(target.dataset.index);
            const action = target.dataset.js;
            if (action === 'cart-close') {
                closeCart();
            } else if (action === 'cart-clear') {
                changeCart(() => {
                    cartItems = [];
                });
                cart.querySelector('[data-js="cart-dialog"]').focus();
            } else if (action === 'cart-remove') {
                changeCart(() => cartItems.splice(index, 1));
                cart.querySelector('[data-js="cart-dialog"]').focus();
            } else if (action === 'cart-minus' || action === 'cart-plus') {
                changeCart(() => {
                    const item = cartItems[index];
                    item.qty = Math.min(99, Math.max(1, item.qty + (action === 'cart-plus' ? 1 : -1)));
                });
                cart.querySelector(`[data-js="${action}"][data-index="${index}"]`)?.focus();
            } else if (action === 'cart-engraving-remove') {
                changeCart(() => {
                    cartItems[index].engraving = null;
                });
            }
        });

        cart.addEventListener('change', (event) => {
            const input = event.target.closest('[data-js="cart-qty"]');
            if (input) {
                changeCart(() => {
                    cartItems[Number(input.dataset.index)].qty = Math.min(99, Math.max(1, parseMoney(input.value) || 1));
                });
            }
        });

        cart.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                closeCart();
                return;
            }
            if (event.key !== 'Tab') {
                return;
            }
            const focusable = cartFocusable(cart);
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (event.shiftKey && (document.activeElement === first || document.activeElement === cart.querySelector('[data-js="cart-dialog"]'))) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        });

        cart.querySelector('[data-js="cart-body"]').addEventListener('scroll', () => updateCartBar(cart), { passive: true });
        window.addEventListener('resize', () => updateCartBar(cart));

        // Keep several open tabs in sync.
        window.addEventListener('storage', (event) => {
            if (event.key === CART_KEY) {
                cartItems = readCart();
                renderCart();
            }
        });
    }

    // ==========================================================================
    // product-card
    // ==========================================================================

    // Favourite and add-to-cart toggles on product cards and on the product page.
    function setFavorite(button, pressed) {
        button.setAttribute('aria-pressed', String(pressed));
        button.setAttribute('aria-label', pressed ? 'Видалити з обраного' : 'Додати в обране');
    }

    function initProductCards() {
        document.addEventListener('click', (event) => {
            const favorite = event.target.closest('[data-js="favorite-toggle"]');
            if (favorite) {
                const pressed = favorite.getAttribute('aria-pressed') !== 'true';
                // Buttons that share data-favorite (header, mobile row, sticky bar) stay in sync.
                const group = favorite.dataset.favorite
                    ? document.querySelectorAll(`[data-js="favorite-toggle"][data-favorite="${favorite.dataset.favorite}"]`)
                    : [favorite];
                group.forEach((button) => setFavorite(button, pressed));
                return;
            }

            const cartButton = event.target.closest('[data-js="cart-add"]');
            if (cartButton) {
                const card = cartButton.closest('.product-card');
                if (cartButton.getAttribute('aria-pressed') === 'true') {
                    openCart(cartButton);
                } else if (card) {
                    addToCart(productFromCard(card), 1);
                }
            }
        });
    }

    // ==========================================================================
    // hero-video
    // ==========================================================================

    // Loads the hero video only on desktop and only when motion is allowed; mobile shows a static banner.
    function initHeroVideo() {
        const video = document.querySelector('[data-js="hero-video"]');
        if (!video) {
            return;
        }
        const desktop = window.matchMedia('(min-width: 1024px)');
        const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

        const load = () => {
            if (!desktop.matches || reducedMotion.matches || video.dataset.loaded) {
                return;
            }
            video.src = video.dataset.src;
            video.dataset.loaded = 'true';
            video.play().catch(() => {});
        };

        load();
        desktop.addEventListener('change', load);
        reducedMotion.addEventListener('change', () => {
            if (reducedMotion.matches) {
                video.pause();
            } else {
                load();
                video.play().catch(() => {});
            }
        });
    }

    // ==========================================================================
    // counter
    // ==========================================================================

    // Quantity steppers: −/+ buttons and a numeric field clamped to 1…99.
    const MIN = 1;
    const MAX = 99;

    function setupCounter(counter) {
        const input = counter.querySelector('[data-js="counter-input"]');
        const minus = counter.querySelector('[data-js="counter-minus"]');
        const plus = counter.querySelector('[data-js="counter-plus"]');

        const set = (value) => {
            const number = Math.min(MAX, Math.max(MIN, Math.round(Number(value)) || MIN));
            input.value = String(number);
            minus.disabled = number <= MIN;
            plus.disabled = number >= MAX;
        };

        minus.addEventListener('click', () => set(Number(input.value) - 1));
        plus.addEventListener('click', () => set(Number(input.value) + 1));
        input.addEventListener('input', () => {
            input.value = input.value.replace(/\D/g, '').slice(0, 2);
        });
        input.addEventListener('change', () => set(input.value));
        set(input.value);
    }

    function getCount(root = document) {
        const input = root.querySelector('[data-js="counter-input"]');
        return input ? Number(input.value) || MIN : MIN;
    }

    function initCounters() {
        document.querySelectorAll('[data-js="counter"]').forEach(setupCounter);
    }

    // ==========================================================================
    // gallery
    // ==========================================================================

    // Product gallery: thumbnails scroll the main slider, the active thumbnail follows the visible slide.
    function setupGallery(gallery) {
        const track = gallery.querySelector('[data-js="slider-track"]');
        const thumbs = [...gallery.querySelectorAll('[data-js="gallery-thumb"]')];
        if (!track || !thumbs.length) {
            return;
        }

        const setActive = (index) => {
            thumbs.forEach((thumb, i) => {
                if (i === index) {
                    thumb.setAttribute('aria-current', 'true');
                } else {
                    thumb.removeAttribute('aria-current');
                }
            });
        };

        thumbs.forEach((thumb, index) => {
            thumb.addEventListener('click', () => {
                const slide = track.children[index];
                const padding = parseFloat(getComputedStyle(track).scrollPaddingLeft) || 0;
                track.scrollTo({ left: slide.offsetLeft - track.offsetLeft - padding });
                setActive(index);
            });
        });

        let frame = 0;
        track.addEventListener('scroll', () => {
            cancelAnimationFrame(frame);
            frame = requestAnimationFrame(() => {
                const slideWidth = track.children[0].getBoundingClientRect().width;
                const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
                const index = Math.round(track.scrollLeft / (slideWidth + gap));
                setActive(Math.min(thumbs.length - 1, Math.max(0, index)));
            });
        }, { passive: true });
    }

    function initGalleries() {
        document.querySelectorAll('[data-js="gallery"]').forEach(setupGallery);
    }

    // ==========================================================================
    // product-page
    // ==========================================================================

    // Product page behaviour: buy buttons, sticky mobile buy bar, anchors that open collapsed panels,
    // brightness levels in the Pure Flood demo, "useful review" likes and the clickable modes progress bar.

    function productFromPage() {
        const page = document.querySelector('.product');
        const color = page.querySelector('.colors__input:checked')?.closest('.colors__item');
        const model = page.querySelector('.models__link[aria-current="page"] img');
        const id = page.dataset.product || 'product';
        return {
            key: `${id}:${color?.querySelector('.colors__input').value || ''}:${pageEngraving ? JSON.stringify(pageEngraving) : ''}`,
            id,
            engraving: pageEngraving && { ...pageEngraving },
            title: page.querySelector('.product__title').textContent.trim(),
            href: window.location.pathname.split('/').pop() || 'product.html',
            image: page.dataset.productImage || '',
            code: page.dataset.productCode || demoCode(id),
            model: model?.alt || '',
            color: color?.querySelector('.colors__name').textContent.trim() || '',
            price: parseMoney(page.querySelector('.product__purchase .price__current')?.textContent),
            oldPrice: parseMoney(page.querySelector('.product__purchase .price__old')?.textContent),
        };
    }

    function initBuyButtons() {
        document.querySelectorAll('[data-js="product-buy"]').forEach((button) => {
            button.addEventListener('click', () => {
                addToCart(productFromPage(), getCount(document.querySelector('.product')));
                openCart(button);
            });
        });
    }

    function initBuyBar() {
        const bar = document.querySelector('[data-js="buy-bar"]');
        const mainButton = document.querySelector('.product__cart');
        if (!bar || !mainButton) {
            return;
        }
        let frame = 0;
        const update = () => {
            // Show the bar only after the main button has scrolled away above the viewport.
            const show = mainButton.getBoundingClientRect().bottom < 0;
            if (bar.hidden === show) {
                bar.hidden = !show;
                document.body.classList.toggle('has-buy-bar', show);
            }
        };
        window.addEventListener('scroll', () => {
            cancelAnimationFrame(frame);
            frame = requestAnimationFrame(update);
        }, { passive: true });
        window.addEventListener('resize', update);
        update();
    }

    function initPanelLinks() {
        document.querySelectorAll('[data-js="panel-link"]').forEach((link) => {
            link.addEventListener('click', () => {
                const panel = document.querySelector(link.getAttribute('href'));
                if (panel && panel.tagName === 'DETAILS') {
                    panel.open = true;
                }
            });
        });
    }

    function initFlood() {
        document.querySelectorAll('[data-js="flood"]').forEach((scene) => {
            const lights = scene.querySelectorAll('[data-js="flood-light"]');
            lights.forEach((light) => {
                light.addEventListener('click', () => {
                    lights.forEach((item) => item.setAttribute('aria-pressed', String(item === light)));
                    scene.dataset.level = light.dataset.level;
                });
            });
        });
    }

    function initReviewLikes() {
        document.querySelectorAll('[data-js="review-like"]').forEach((button) => {
            const counter = button.querySelector('[data-js="review-likes"]');
            button.addEventListener('click', () => {
                const pressed = button.getAttribute('aria-pressed') !== 'true';
                button.setAttribute('aria-pressed', String(pressed));
                counter.textContent = String(Number(counter.textContent) + (pressed ? 1 : -1));
            });
        });
    }

    function initModesProgress() {
        document.querySelectorAll('.modes').forEach((modes) => {
            const progress = modes.querySelector('.modes__progress');
            const track = modes.querySelector('[data-js="slider-track"]');
            if (!progress || !track) {
                return;
            }
            progress.addEventListener('click', (event) => {
                const rect = progress.getBoundingClientRect();
                const index = Math.floor(((event.clientX - rect.left) / rect.width) * track.children.length);
                const slide = track.children[Math.min(track.children.length - 1, Math.max(0, index))];
                track.scrollTo({ left: slide.offsetLeft - track.offsetLeft });
            });
        });
    }

    function initProductPage() {
        if (!document.querySelector('.product')) {
            return;
        }
        initBuyButtons();
        initBuyBar();
        initPanelLinks();
        initFlood();
        initReviewLikes();
        initModesProgress();
    }

    // ==========================================================================
    // checkout
    // ==========================================================================

    // Checkout form: order summary from the cart, delivery / payment options, promo code, validation.
    // Frontend demo: the order is saved to sessionStorage and the result page reads it back.
    const ORDER_KEY = 'olight-last-order';
    const DELIVERY_PRICES = { branch: 75, postomat: 81, doors: 150 };
    const DELIVERY_NAMES = { branch: 'Відділення Нової Пошти', postomat: 'Поштомат Нової Пошти', doors: 'Кур’єр Нової Пошти' };
    const PAYMENT_NAMES = { card: 'Оплата карткою Visa/MasterCard', wallet: 'Google Pay, Apple Pay', cash: 'При отриманні' };
    const SUBMIT_LABELS = { card: 'Оплатити онлайн', wallet: 'Перейти до оплати', cash: 'Замовлення підтверджую' };
    const PROMO_CODES = { TCKZLO: 115 }; // demo: the backend validates codes
    const MONTHS = ['Січень', 'Лютий', 'Березень', 'Квітень', 'Травень', 'Червень', 'Липень', 'Серпень', 'Вересень', 'Жовтень', 'Листопад', 'Грудень'];

    // Demo directory data; the backend replaces it with Nova Poshta API lookups.
    const COMBOBOX_DATA = {
        cities: ['Київ', 'Одеса', 'Дніпро', 'Львів', 'Харків', 'Івано-Франківськ', 'Житомир', 'Чернігів', 'Вінниця', 'Полтава'],
        branches: ['Відділення №1, вул. Пирогівський шлях, 135', 'Відділення №3, просп. Перемоги, 22', 'Відділення №12, вул. Хрещатик, 10', 'Відділення №25, вул. Січових Стрільців, 48', 'Відділення №41, вул. Велика Васильківська, 72'],
        postomats: ['Поштомат №25395, просп. Левка Лук’яненка, 18а', 'Поштомат №10221, вул. Шевченка, 5', 'Поштомат №31007, вул. Миру, 41', 'Поштомат №40512, бул. Лесі Українки, 9'],
        streets: ['вул. Хрещатик', 'вул. Шевченка', 'вул. Січових Стрільців', 'просп. Перемоги', 'вул. Велика Васильківська', 'бул. Лесі Українки', 'вул. Миру'],
        times: ['09:00–12:00', '12:00–15:00', '15:00–18:00', '18:00–21:00'],
    };

    let promoDiscount = 0;

    function checkoutItems() {
        return cartItems.filter((item) => item.available);
    }

    function orderItemHtml(item, wide = false) {
        const sale = item.oldPrice > item.price;
        const props = [['Модель:', item.model], ['Колір:', item.color]].filter(([, value]) => value)
            .map(([name, value]) => `<div class="order-item__prop"><dt class="order-item__prop-name">${name}</dt><dd class="order-item__prop-value">${escapeHtml(value)}</dd></div>`).join('');
        const engraving = item.engraving
            ? `<div class="order-item__row"><span class="order-item__label">Гравіювання: ${item.engraving.type === 'text' ? 'текст' : 'малюнок'}</span><span class="order-item__sum">${formatMoney(item.engraving.price * item.qty)}</span></div>
               <div class="order-item__row order-item__row--total"><span class="order-item__label">Всього</span><span class="order-item__sum">${formatMoney((item.price + item.engraving.price) * item.qty)}</span></div>`
            : '';
        return `
            <li class="${wide ? 'order-card__item' : 'order-summary__item'}">
                <article class="order-item${wide ? ' order-item--wide' : ''}">
                    <img class="order-item__image" src="${escapeHtml(item.image)}" width="50" height="50" alt="">
                    <div class="order-item__content">
                        <div class="order-item__main">
                            <div class="order-item__info">
                                <p class="order-item__code">Код товару: ${escapeHtml(item.code)}</p>
                                <h3 class="order-item__title">${escapeHtml(item.title)}</h3>
                                ${props ? `<dl class="order-item__props">${props}</dl>` : ''}
                            </div>
                            <div class="order-item__numbers">
                                <div class="order-item__row">
                                    <p class="order-item__price price price--order${sale ? ' price--sale' : ''}">${sale ? `<s class="price__old">${formatMoney(item.oldPrice)}</s>` : ''}<span class="price__current">${formatMoney(item.price)}</span></p>
                                    <span class="order-item__qty">${item.qty}шт.</span>
                                    <span class="order-item__sum">${formatMoney(item.price * item.qty)}</span>
                                </div>
                                ${engraving}
                            </div>
                        </div>
                    </div>
                </article>
            </li>`;
    }

    function orderTotals(items, delivery, promo) {
        const goods = items.reduce((sum, item) => sum + item.price * item.qty, 0);
        const engraving = items.reduce((sum, item) => sum + (item.engraving ? item.engraving.price * item.qty : 0), 0);
        const discount = items.reduce((sum, item) => sum + Math.max(0, item.oldPrice - item.price) * item.qty, 0);
        const deliveryPrice = delivery ? (goods + engraving >= FREE_DELIVERY_FROM ? 0 : DELIVERY_PRICES[delivery]) : null;
        return { goods, engraving, discount, promo, delivery: deliveryPrice, pay: Math.max(0, goods + engraving - promo + (deliveryPrice || 0)) };
    }

    function renderTotals(root, totals) {
        const set = (name, text) => root.querySelectorAll(`[data-js="${name}"]`).forEach((element) => {
            element.textContent = text;
        });
        set('total-goods', formatMoney(totals.goods));
        set('total-engraving', formatMoney(totals.engraving));
        set('total-discount', totals.discount ? `-${formatMoney(totals.discount)}` : formatMoney(0));
        root.querySelectorAll('[data-js="total-discount"]').forEach((element) => element.classList.toggle('totals__value--zero', !totals.discount));
        set('total-promo', `-${formatMoney(totals.promo)}`);
        root.querySelectorAll('[data-js="total-promo-row"]').forEach((row) => {
            row.hidden = !totals.promo;
        });
        set('total-delivery', totals.delivery === null ? '—' : totals.delivery === 0 ? 'Безкоштовно' : formatMoney(totals.delivery));
        set('total-pay', formatMoney(totals.pay));
    }

    function renderFreeDelivery(root, amount) {
        const left = FREE_DELIVERY_FROM - amount;
        root.querySelectorAll('[data-js="free-delivery-title"]').forEach((title) => {
            title.textContent = left > 0 ? `Замовте ще на ${formatMoney(left)}` : 'Безкоштовна доставка';
        });
        root.querySelectorAll('[data-js="free-delivery-note"]').forEach((note) => {
            note.textContent = left > 0
                ? 'Та отримайте безкоштовну доставку до відділення поштових служб'
                : 'Ваше замовлення буде доставлено до відділення поштових служб безкоштовно';
        });
    }

    // ----- field errors -----
    function setFieldError(field, message) {
        const error = field.querySelector('[data-js="field-error"]');
        field.classList.toggle('field--invalid', Boolean(message));
        field.querySelector('input, textarea')?.setAttribute('aria-invalid', String(Boolean(message)));
        if (error) {
            error.textContent = message || '';
            error.hidden = !message;
            const input = field.querySelector('input, textarea');
            if (input) {
                error.id = error.id || `${input.id}-error`;
                if (message) {
                    input.setAttribute('aria-describedby', error.id);
                } else {
                    input.removeAttribute('aria-describedby');
                }
            }
        }
    }

    // ----- phone mask: +38 (0XX) XXX-XX-XX -----
    function formatPhone(value) {
        let digits = value.replace(/\D/g, '');
        if (digits.startsWith('380')) {
            digits = digits.slice(2);
        } else if (digits.startsWith('80')) {
            digits = digits.slice(1);
        }
        if (digits && !digits.startsWith('0')) {
            digits = `0${digits}`;
        }
        digits = digits.slice(0, 10);
        if (!digits) {
            return '';
        }
        let result = `+38 (${digits.slice(0, 3)}`;
        if (digits.length >= 3) {
            result += ')';
        }
        if (digits.length > 3) {
            result += ` ${digits.slice(3, 6)}`;
        }
        if (digits.length > 6) {
            result += `-${digits.slice(6, 8)}`;
        }
        if (digits.length > 8) {
            result += `-${digits.slice(8, 10)}`;
        }
        return result;
    }

    // ----- combobox -----
    function setupCombobox(box) {
        const input = box.querySelector('.combobox__input');
        const list = box.querySelector('.combobox__list');
        const options = COMBOBOX_DATA[box.dataset.source] || [];
        let filtered = [];
        let active = -1;

        const close = () => {
            list.hidden = true;
            input.setAttribute('aria-expanded', 'false');
            input.removeAttribute('aria-activedescendant');
            active = -1;
        };

        const render = () => {
            const query = input.value.trim().toLowerCase();
            filtered = options.filter((option) => option.toLowerCase().includes(query));
            list.innerHTML = filtered.length
                ? filtered.map((option, index) => `<li class="combobox__option" id="${list.id}-${index}" role="option" aria-selected="${index === active}">${escapeHtml(option)}</li>`).join('')
                : '<li class="combobox__empty" role="option" aria-disabled="true" aria-selected="false">Нічого не знайдено</li>';
            if (active >= 0) {
                input.setAttribute('aria-activedescendant', `${list.id}-${active}`);
                list.children[active]?.scrollIntoView({ block: 'nearest' });
            } else {
                input.removeAttribute('aria-activedescendant');
            }
        };

        const open = () => {
            render();
            list.hidden = false;
            input.setAttribute('aria-expanded', 'true');
        };

        const choose = (value) => {
            input.value = value;
            setFieldError(box, '');
            close();
            input.dispatchEvent(new Event('change', { bubbles: true }));
        };

        input.addEventListener('focus', open);
        input.addEventListener('click', open);
        input.addEventListener('input', () => {
            active = -1;
            open();
        });
        input.addEventListener('keydown', (event) => {
            if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                event.preventDefault();
                if (list.hidden) {
                    open();
                }
                const step = event.key === 'ArrowDown' ? 1 : -1;
                active = filtered.length ? (active + step + filtered.length) % filtered.length : -1;
                render();
            } else if (event.key === 'Enter' && !list.hidden && active >= 0) {
                event.preventDefault();
                choose(filtered[active]);
            } else if (event.key === 'Escape' && !list.hidden) {
                event.stopPropagation();
                close();
            }
        });
        list.addEventListener('mousedown', (event) => {
            // mousedown keeps focus in the input, so blur does not close the list before the click.
            const option = event.target.closest('.combobox__option');
            if (option) {
                event.preventDefault();
                choose(filtered[[...list.children].indexOf(option)]);
            }
        });
        input.addEventListener('blur', close);
    }

    // ----- calendar -----
    function setupDatepicker(picker) {
        const input = picker.querySelector('[data-js="datepicker-input"]');
        const toggle = picker.querySelector('[data-js="datepicker-toggle"]');
        const calendar = picker.querySelector('[data-js="calendar"]');
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        // data-range="past" (birthday): up to today; otherwise from today to the end of next year.
        const pastOnly = picker.dataset.range === 'past';
        const minDate = pastOnly ? new Date(today.getFullYear() - 100, 0, 1) : today;
        const maxDate = pastOnly ? today : new Date(today.getFullYear() + 1, 11, 31);
        const minMonth = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
        const maxMonth = new Date(maxDate.getFullYear(), maxDate.getMonth(), 1);
        const parsed = input.value.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
        let selected = parsed ? new Date(Number(parsed[3]), Number(parsed[2]) - 1, Number(parsed[1])) : null;
        let view = selected ? new Date(selected.getFullYear(), selected.getMonth(), 1) : (pastOnly ? maxMonth : minMonth);

        const format = (date) => `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}.${date.getFullYear()}`;
        let mode = 'days'; // days | months | years (Figma: Calendar, Calendar_month, Calendar_year)

        const render = () => {
            const year = view.getFullYear();
            const month = view.getMonth();
            const first = new Date(year, month, 1);
            const start = new Date(year, month, 1 - ((first.getDay() + 6) % 7)); // weeks start on Monday
            const days = [];
            for (let i = 0; i < 42; i += 1) {
                const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
                if (i >= 35 && date.getMonth() !== month) {
                    break;
                }
                const outside = date.getMonth() !== month;
                const past = date < minDate || date > maxDate;
                const isSelected = selected && date.getTime() === selected.getTime();
                days.push(`<button class="calendar__day${outside ? ' calendar__day--outside' : ''}" type="button" data-date="${date.getTime()}" aria-label="${format(date)}" aria-pressed="${Boolean(isSelected)}"${past ? ' disabled' : ''}>${date.getDate()}</button>`);
            }
            const years = [];
            for (let value = maxDate.getFullYear(); value >= minDate.getFullYear(); value -= 1) {
                years.push(value);
            }
            if (!pastOnly) {
                years.reverse();
            }
            const chevron = '<svg class="calendar__caret" width="16" height="16" aria-hidden="true"><use href="#icon-chevron-down"></use></svg>';
            const back = (label) => `<button class="calendar__back" type="button" aria-label="Повернутися до днів" data-mode="days"><svg width="16" height="16" aria-hidden="true"><use href="#icon-chevron-left"></use></svg></button><span class="calendar__caption">${label}</span>`;

            if (mode === 'months') {
                calendar.innerHTML = `
                <div class="calendar__head calendar__head--back">${back(MONTHS[month])}</div>
                <div class="calendar__options calendar__options--months">
                    ${MONTHS.map((name, index) => {
                        const outOfRange = new Date(year, index + 1, 0) < minDate || new Date(year, index, 1) > maxDate;
                        return `<button class="calendar__option" type="button" data-month="${index}" aria-pressed="${index === month}"${outOfRange ? ' disabled' : ''}>${name}</button>`;
                    }).join('')}
                </div>`;
                return;
            }
            if (mode === 'years') {
                calendar.innerHTML = `
                <div class="calendar__head calendar__head--back">${back(year)}</div>
                <div class="calendar__options calendar__options--years">
                    ${years.map((value) => `<button class="calendar__option" type="button" data-year="${value}" aria-pressed="${value === year}">${value}</button>`).join('')}
                </div>`;
                return;
            }
            calendar.innerHTML = `
                <div class="calendar__head">
                    <button class="calendar__nav" type="button" aria-label="Попередній місяць" data-step="-1"${view <= minMonth ? ' disabled' : ''}><svg width="16" height="16" aria-hidden="true"><use href="#icon-chevron-left"></use></svg></button>
                    <div class="calendar__selects">
                        <button class="calendar__switch" type="button" aria-label="Обрати місяць, зараз ${MONTHS[month]}" data-mode="months">${MONTHS[month]}${chevron}</button>
                        <button class="calendar__switch" type="button" aria-label="Обрати рік, зараз ${year}" data-mode="years">${year}${chevron}</button>
                    </div>
                    <button class="calendar__nav" type="button" aria-label="Наступний місяць" data-step="1"${view >= maxMonth ? ' disabled' : ''}><svg width="16" height="16" aria-hidden="true"><use href="#icon-chevron-right"></use></svg></button>
                </div>
                <div class="calendar__grid">
                    ${['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'].map((day) => `<span class="calendar__weekday" aria-hidden="true">${day}</span>`).join('')}
                    ${days.join('')}
                </div>`;
        };

        const close = () => {
            calendar.hidden = true;
            toggle.setAttribute('aria-expanded', 'false');
        };

        const open = () => {
            mode = 'days';
            render();
            calendar.hidden = false;
            toggle.setAttribute('aria-expanded', 'true');
            (calendar.querySelector('.calendar__day[aria-pressed="true"]') || calendar.querySelector('.calendar__day:not(:disabled)'))?.focus();
        };

        const setView = (date) => {
            view = date < minMonth ? minMonth : (date > maxMonth ? maxMonth : date);
            render();
        };

        input.addEventListener('click', () => (calendar.hidden ? open() : close()));
        toggle.addEventListener('click', () => (calendar.hidden ? open() : close()));
        calendar.addEventListener('click', (event) => {
            const day = event.target.closest('.calendar__day');
            const nav = event.target.closest('.calendar__nav');
            if (day && !day.disabled) {
                selected = new Date(Number(day.dataset.date));
                input.value = format(selected);
                setFieldError(picker, '');
                close();
                input.focus();
            } else if (nav && !nav.disabled) {
                setView(new Date(view.getFullYear(), view.getMonth() + Number(nav.dataset.step), 1));
            } else if (event.target.closest('[data-mode]')) {
                mode = event.target.closest('[data-mode]').dataset.mode;
                render();
                (calendar.querySelector('.calendar__option[aria-pressed="true"]') || calendar.querySelector('.calendar__switch, .calendar__day:not(:disabled)'))?.focus();
            } else if (event.target.closest('.calendar__option:not(:disabled)')) {
                const option = event.target.closest('.calendar__option');
                mode = 'days';
                setView(option.dataset.month !== undefined
                    ? new Date(view.getFullYear(), Number(option.dataset.month), 1)
                    : new Date(Number(option.dataset.year), view.getMonth(), 1));
                calendar.querySelector('.calendar__switch')?.focus();
            }
        });
        calendar.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                event.stopPropagation();
                close();
                input.focus();
            }
        });
        // composedPath: the clicked button may already be re-rendered (detached) by now.
        document.addEventListener('click', (event) => {
            if (!event.composedPath().includes(picker)) {
                close();
            }
        });
    }

    // ----- promo code & comment -----
    function setupExtra(extra, onToggle) {
        const toggle = extra.querySelector('[data-js="extra-toggle"]');
        const body = extra.querySelector('[data-js="extra-body"]');
        const set = (open) => {
            body.hidden = !open;
            toggle.setAttribute('aria-expanded', String(open));
            onToggle?.(open);
            if (open) {
                body.querySelector('input, textarea')?.focus();
            }
        };
        toggle.addEventListener('click', () => set(body.hidden));
        return set;
    }

    function setupPromo(promo, onChange) {
        const toggle = promo.querySelector('[data-js="extra-toggle"]');
        const field = promo.querySelector('[data-js="promo-field"]');
        const input = promo.querySelector('[data-js="promo-input"]');
        const apply = promo.querySelector('[data-js="promo-apply"]');
        const clear = promo.querySelector('[data-js="promo-clear"]');
        const remove = promo.querySelector('[data-js="promo-remove"]');
        const error = promo.querySelector('[data-js="promo-error"]');
        const value = promo.querySelector('[data-js="promo-value"]');
        let applied = '';

        const sync = () => {
            const code = input.value.trim().toUpperCase();
            const invalid = field.classList.contains('field--invalid');
            apply.hidden = !code || invalid || code === applied;
            clear.hidden = !invalid;
            remove.hidden = !applied || code !== applied;
            field.classList.toggle('promo-field--applied', Boolean(applied) && code === applied);
        };

        const setToggleText = (open) => {
            toggle.textContent = open ? 'Закрити' : applied ? 'Змінити' : 'Додати';
            value.hidden = open || !applied;
            value.textContent = applied ? `: ${applied}` : '';
        };

        setupExtra(promo, setToggleText);

        input.addEventListener('input', () => {
            field.classList.remove('field--invalid');
            error.hidden = true;
            sync();
        });
        input.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                apply.click();
            }
        });
        apply.addEventListener('click', () => {
            const code = input.value.trim().toUpperCase();
            if (PROMO_CODES[code]) {
                applied = code;
                input.value = code;
                onChange(PROMO_CODES[code]);
                promo.querySelector('[data-js="extra-body"]').hidden = true;
                toggle.setAttribute('aria-expanded', 'false');
                setToggleText(false);
                toggle.focus();
            } else {
                field.classList.add('field--invalid');
                error.hidden = false;
                input.setAttribute('aria-invalid', 'true');
            }
            sync();
        });
        clear.addEventListener('click', () => {
            input.value = '';
            field.classList.remove('field--invalid');
            error.hidden = true;
            input.focus();
            sync();
        });
        remove.addEventListener('click', () => {
            applied = '';
            input.value = '';
            onChange(0);
            input.focus();
            sync();
        });
        sync();
    }

    // ----- validation -----
    function validateCheckout(form) {
        const errors = [];
        const check = (input, message) => {
            const field = input.closest('[data-js="field"], [data-js="combobox"], [data-js="datepicker"]');
            const visible = input.offsetParent !== null || input.closest('[data-js="datepicker"]')?.offsetParent !== null;
            if (!field || !visible) {
                return;
            }
            setFieldError(field, message);
            if (message) {
                errors.push(input);
            }
        };

        const name = form.elements.name;
        check(name, name.value.trim().length < 2 ? 'Вкажіть ім’я' : '');
        const phone = form.elements.phone;
        check(phone, phone.value.replace(/\D/g, '').length !== 12 ? 'Вкажіть номер телефону у форматі +38 (0XX) XXX-XX-XX' : '');
        const email = form.elements.email;
        check(email, email.value.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim()) ? 'Перевірте адресу e-mail' : '');

        const delivery = form.querySelector('input[name="delivery"]:checked');
        form.querySelector('[data-js="delivery-error"]').hidden = Boolean(delivery);
        if (!delivery) {
            errors.push(form.querySelector('input[name="delivery"]'));
        } else {
            delivery.closest('[data-js="choice"]').querySelectorAll('[data-js="choice-body"] input[required]').forEach((input) => {
                check(input, input.value.trim() ? '' : 'Заповніть це поле');
            });
        }

        const consent = form.querySelector('[data-js="checkout-consent"]');
        form.querySelector('[data-js="consent-error"]').hidden = consent.checked;
        if (!consent.checked) {
            errors.push(consent);
        }
        return errors;
    }

    function initCheckout() {
        const form = document.querySelector('[data-js="checkout-form"]');
        if (!form) {
            return;
        }
        const page = form.closest('.checkout');
        const submit = form.querySelector('[data-js="checkout-submit"]');
        const consent = form.querySelector('[data-js="checkout-consent"]');

        const update = () => {
            const items = checkoutItems();
            const empty = items.length === 0;
            page.querySelector('[data-js="checkout-empty"]').hidden = !empty;
            form.hidden = empty;
            if (empty) {
                return;
            }
            const delivery = form.querySelector('input[name="delivery"]:checked')?.value;
            const totals = orderTotals(items, delivery, promoDiscount);
            form.querySelector('[data-js="checkout-items"]').innerHTML = items.map((item) => orderItemHtml(item)).join('');
            renderTotals(form, totals);
            renderFreeDelivery(form, totals.goods + totals.engraving);
        };

        // Choices: only the selected option shows its fields; those fields are required only while visible.
        form.querySelectorAll('[data-js="choices"]').forEach((group) => {
            group.addEventListener('change', (event) => {
                if (!event.target.matches('.choice__input')) {
                    return;
                }
                group.querySelectorAll('[data-js="choice"]').forEach((choice) => {
                    const body = choice.querySelector('[data-js="choice-body"]');
                    if (body) {
                        body.hidden = !choice.querySelector('.choice__input').checked;
                    }
                });
                if (event.target.name === 'payment') {
                    submit.textContent = SUBMIT_LABELS[event.target.value];
                } else {
                    form.querySelector('[data-js="delivery-error"]').hidden = true;
                }
                update();
            });
        });

        form.querySelectorAll('[data-js="combobox"]').forEach(setupCombobox);
        form.querySelectorAll('[data-js="datepicker"]').forEach(setupDatepicker);
        setupExtra(form.querySelector('[data-js="comment"]'), (open) => {
            form.querySelector('[data-js="comment"] [data-js="extra-toggle"]').textContent = open ? 'Закрити' : 'Додати';
        });
        setupPromo(form.querySelector('[data-js="promo"]'), (discount) => {
            promoDiscount = discount;
            update();
        });

        const housing = form.querySelector('[data-js="housing-switch"]');
        housing?.addEventListener('change', () => {
            const fields = form.querySelector('[data-js="housing-fields"]');
            fields.hidden = housing.checked;
            fields.querySelectorAll('input').forEach((input) => {
                input.disabled = housing.checked;
            });
        });

        const phone = form.querySelector('[data-js="phone"]');
        phone.addEventListener('input', () => {
            phone.value = formatPhone(phone.value);
        });
        phone.addEventListener('focus', () => {
            if (!phone.value) {
                phone.value = '+38 (0';
            }
        });
        phone.addEventListener('blur', () => {
            if (phone.value.replace(/\D/g, '').length <= 3) {
                phone.value = '';
            }
        });

        // Fix errors as the user edits a field.
        form.addEventListener('input', (event) => {
            const field = event.target.closest('[data-js="field"].field--invalid, [data-js="combobox"].field--invalid');
            if (field) {
                setFieldError(field, '');
            }
        });

        consent.addEventListener('change', () => {
            submit.classList.toggle('checkout__submit--ready', consent.checked);
            if (consent.checked) {
                form.querySelector('[data-js="consent-error"]').hidden = true;
            }
        });

        form.querySelector('[data-js="summary-toggle"]').addEventListener('click', (event) => {
            const button = event.currentTarget;
            const expanded = button.getAttribute('aria-expanded') === 'true';
            button.setAttribute('aria-expanded', String(!expanded));
            button.setAttribute('aria-label', expanded ? 'Розгорнути список товарів' : 'Згорнути список товарів');
            form.querySelector('[data-js="checkout-items"]').hidden = expanded;
        });

        form.addEventListener('submit', (event) => {
            event.preventDefault();
            const errors = validateCheckout(form);
            if (errors.length) {
                errors[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
                errors[0].focus({ preventScroll: true });
                return;
            }
            const data = new FormData(form);
            const delivery = data.get('delivery');
            const payment = data.get('payment');
            const items = checkoutItems();
            const address = delivery === 'doors'
                ? [data.get('doors-city'), data.get('street'), data.get('house') && `б.${data.get('house')}`, data.get('flat') && `кв.${data.get('flat')}`].filter(Boolean).join(', ')
                : [data.get(`${delivery}-city`), data.get(delivery)].filter(Boolean).join(', ');
            const order = {
                number: String(80000 + Math.floor(Math.random() * 19999)),
                date: new Date().toISOString(),
                items,
                totals: orderTotals(items, delivery, promoDiscount),
                delivery: DELIVERY_NAMES[delivery],
                address: `Нова Пошта, ${address}`,
                recipient: String(data.get('name')).trim(),
                payment: PAYMENT_NAMES[payment],
                paid: payment !== 'cash',
            };
            try {
                sessionStorage.setItem(ORDER_KEY, JSON.stringify(order));
            } catch {
                // The result page falls back to the demo order.
            }
            changeCart(() => {
                cartItems = cartItems.filter((item) => !item.available);
            });
            window.location.href = form.getAttribute('action');
        });

        window.addEventListener('storage', update);
        update();
    }

    // Result pages fill the order card with the order just placed (falls back to the demo order in the markup).
    function initOrderResult() {
        const card = document.querySelector('[data-js="order-card"]');
        if (!card) {
            return;
        }
        let order = null;
        try {
            order = JSON.parse(sessionStorage.getItem(ORDER_KEY));
        } catch {
            order = null;
        }
        if (!order) {
            return;
        }
        const date = new Date(order.date);
        const day = `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}.${date.getFullYear()}`;
        document.querySelectorAll('[data-js="order-number"]').forEach((number) => {
            number.textContent = order.number;
        });
        const time = card.querySelector('[data-js="order-date"]');
        time.textContent = day;
        time.setAttribute('datetime', order.date.slice(0, 10));
        card.querySelector('[data-js="order-items"]').innerHTML = order.items.map((item) => orderItemHtml(item, true)).join('');
        card.querySelector('[data-js="order-delivery-type"]').textContent = order.delivery;
        card.querySelector('[data-js="order-address"]').textContent = order.address;
        card.querySelector('[data-js="order-recipient"]').textContent = order.recipient;
        card.querySelector('[data-js="order-payment"]').textContent = order.payment;
        renderTotals(card, order.totals);
    }

    // ==========================================================================
    // tabbar
    // ==========================================================================

    // Mobile bottom navigation: catalogue sheet, search (shared with the header), back to top.
    function initTabbar() {
        const sheet = document.querySelector('[data-js="catalog-sheet"]');
        const toggle = document.querySelector('[data-js="catalog-toggle"]');
        const top = document.querySelector('[data-js="tabbar-top"]');
        if (!toggle || !sheet) {
            return;
        }

        const close = (returnFocus = false) => {
            if (sheet.hidden) {
                return;
            }
            sheet.hidden = true;
            toggle.setAttribute('aria-expanded', 'false');
            unlockScroll('catalog');
            if (returnFocus) {
                toggle.focus();
            }
        };

        const open = () => {
            // Only one bottom panel at a time: close the search first.
            const search = document.querySelector('[data-js="search"]');
            if (search && !search.hidden) {
                document.querySelector('.tabbar [data-js="search-toggle"]')?.click();
            }
            sheet.hidden = false;
            toggle.setAttribute('aria-expanded', 'true');
            lockScroll('catalog');
            sheet.querySelector('.catalog-sheet__panel').focus({ preventScroll: true });
        };

        toggle.addEventListener('click', () => (sheet.hidden ? open() : close()));
        document.querySelectorAll('[data-js="search-toggle"]').forEach((button) => button.addEventListener('click', () => close()));
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                close(true);
            }
        });
        document.addEventListener('click', (event) => {
            if (!sheet.hidden && !sheet.contains(event.target) && !toggle.contains(event.target)) {
                close();
            }
        });
        desktop.addEventListener('change', (event) => {
            if (event.matches) {
                close();
            }
        });

        if (top) {
            let frame = 0;
            const update = () => {
                top.hidden = window.scrollY < window.innerHeight;
            };
            window.addEventListener('scroll', () => {
                cancelAnimationFrame(frame);
                frame = requestAnimationFrame(update);
            }, { passive: true });
            top.querySelector('[data-js="scroll-top"]').addEventListener('click', () => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });
            update();
        }
    }

    // ==========================================================================
    // modal
    // ==========================================================================

    // Generic popup: [data-js="modal-open"][data-modal="id"] opens, [data-js="modal-close"] / Esc close.
    const MODAL_FOCUSABLE = `${FOCUSABLE}, select, textarea`;
    const modalOpeners = new WeakMap();

    // stack: keep already open popups underneath (font preview over the engraving form).
    function openModal(modal, opener = document.activeElement, { stack = false } = {}) {
        if (!modal) {
            return;
        }
        if (!stack) {
            document.querySelectorAll('[data-js="modal"]:not([hidden])').forEach((other) => closeModal(other, false));
        }
        modalOpeners.set(modal, opener);
        modal.hidden = false;
        lockScroll(`modal:${modal.id}`);
        const dialog = modal.querySelector('.modal__dialog');
        (dialog.querySelector(MODAL_FOCUSABLE.split(', ').map((selector) => `.modal__body ${selector}`).join(', ')) || dialog).focus();
        modal.dispatchEvent(new CustomEvent('modal:open'));
    }

    function closeModal(modal, restoreFocus = true) {
        if (!modal || modal.hidden) {
            return;
        }
        modal.hidden = true;
        unlockScroll(`modal:${modal.id}`);
        modal.dispatchEvent(new CustomEvent('modal:close'));
        const opener = modalOpeners.get(modal);
        if (restoreFocus && opener && document.contains(opener)) {
            opener.focus();
        }
    }

    function initModals() {
        document.addEventListener('click', (event) => {
            const opener = event.target.closest('[data-js="modal-open"]');
            if (opener) {
                event.preventDefault();
                openModal(document.getElementById(opener.dataset.modal), opener);
                return;
            }
            const closer = event.target.closest('[data-js="modal-close"]');
            if (closer) {
                closeModal(closer.closest('[data-js="modal"]'));
            }
        });
        document.addEventListener('keydown', (event) => {
            // The topmost popup is the last open one in the document.
            const modal = [...document.querySelectorAll('[data-js="modal"]:not([hidden])')].pop();
            if (!modal) {
                return;
            }
            if (event.key === 'Escape') {
                closeModal(modal);
            } else if (event.key === 'Tab') {
                const items = [...modal.querySelectorAll(MODAL_FOCUSABLE)].filter((item) => item.offsetParent !== null);
                const first = items[0];
                const last = items[items.length - 1];
                if (event.shiftKey && (document.activeElement === first || !modal.contains(document.activeElement))) {
                    event.preventDefault();
                    last.focus();
                } else if (!event.shiftKey && document.activeElement === last) {
                    event.preventDefault();
                    first.focus();
                }
            }
        });
    }

    // ==========================================================================
    // account
    // ==========================================================================

    // Frontend demo of the personal account. Login state lives in localStorage; the SMS code
    // is accepted unless it is 000000 (shows the error state from Figma).
    const AUTH_KEY = 'olight-auth';
    const SETTINGS_KEY = 'olight-settings';
    const CODE_LIFETIME = 116; // seconds, Figma shows 01:56

    function setupPhoneInput(phone) {
        phone.addEventListener('input', () => {
            phone.value = formatPhone(phone.value);
        });
        phone.addEventListener('focus', () => {
            if (!phone.value) {
                phone.value = '+38 (0';
            }
        });
        phone.addEventListener('blur', () => {
            if (phone.value.replace(/\D/g, '').length <= 3) {
                phone.value = '';
            }
        });
    }

    const isPhoneComplete = (value) => value.replace(/\D/g, '').length === 12;

    // ----- SMS code popup -----
    function setupVerify(modal) {
        const form = modal.querySelector('[data-js="verify"]');
        const cells = [...form.querySelectorAll('[data-js="code-cell"]')];
        const error = form.querySelector('[data-js="verify-error"]');
        const timer = form.querySelector('[data-js="verify-timer"]');
        const time = form.querySelector('[data-js="verify-time"]');
        const resend = form.querySelector('[data-js="verify-resend"]');
        const submit = form.querySelector('[data-js="verify-submit"]');
        let left = CODE_LIFETIME;
        let interval = null;

        const code = () => cells.map((cell) => cell.value).join('');
        const update = () => {
            submit.disabled = code().length !== cells.length;
        };
        const setError = (on) => {
            form.classList.toggle('verify--error', on);
            error.hidden = !on;
            cells.forEach((cell) => cell.setAttribute('aria-invalid', String(on)));
            if (on) {
                clearInterval(interval);
                timer.hidden = true;
                resend.querySelector('span').textContent = 'Надіслати код повторно';
                resend.hidden = false;
            }
        };
        const tick = () => {
            time.textContent = `${String(Math.floor(left / 60)).padStart(2, '0')}:${String(left % 60).padStart(2, '0')}`;
            const expired = left <= 0;
            timer.hidden = expired;
            if (expired) {
                clearInterval(interval);
                resend.querySelector('span').textContent = 'Відправити ще раз';
                resend.hidden = false;
            }
            left -= 1;
        };
        const start = () => {
            clearInterval(interval);
            left = CODE_LIFETIME;
            resend.hidden = true;
            setError(false);
            cells.forEach((cell) => {
                cell.value = '';
            });
            update();
            tick();
            interval = setInterval(tick, 1000);
            cells[0].focus();
        };

        const fill = (from, digits) => {
            [...digits].forEach((digit, offset) => {
                if (cells[from + offset]) {
                    cells[from + offset].value = digit;
                }
            });
            cells[Math.min(from + digits.length, cells.length - 1)].focus();
        };

        form.addEventListener('input', (event) => {
            const index = cells.indexOf(event.target);
            if (index === -1) {
                return;
            }
            const digits = event.target.value.replace(/\D/g, '');
            event.target.value = '';
            if (digits) {
                fill(index, digits);
            }
            setError(false);
            update();
        });
        form.addEventListener('paste', (event) => {
            const index = cells.indexOf(event.target);
            const digits = (event.clipboardData?.getData('text') || '').replace(/\D/g, '');
            if (index !== -1 && digits) {
                event.preventDefault();
                fill(index, digits);
                update();
            }
        });
        form.addEventListener('keydown', (event) => {
            const index = cells.indexOf(event.target);
            if (index === -1) {
                return;
            }
            if (event.key === 'Backspace' && !event.target.value && index > 0) {
                cells[index - 1].value = '';
                cells[index - 1].focus();
                update();
            } else if (event.key === 'ArrowLeft' && index > 0) {
                cells[index - 1].focus();
            } else if (event.key === 'ArrowRight' && index < cells.length - 1) {
                cells[index + 1].focus();
            }
        });
        resend.addEventListener('click', start);
        form.addEventListener('submit', (event) => {
            event.preventDefault();
            if (code() === '000000') {
                setError(true);
                return;
            }
            clearInterval(interval);
            modal.dispatchEvent(new CustomEvent('verify:success'));
        });

        modal.addEventListener('modal:open', start);
        modal.addEventListener('modal:close', () => clearInterval(interval));
    }

    // ----- login -----
    function initAuth() {
        const form = document.querySelector('[data-js="auth-form"]');
        const modal = document.getElementById('verify-modal');
        if (!form || !modal) {
            return;
        }
        // Already signed in (demo flag): go straight to the account.
        try {
            if (localStorage.getItem(AUTH_KEY)) {
                window.location.replace(window.matchMedia('(min-width: 1024px)').matches ? 'orders.html' : 'cabinet.html');
                return;
            }
        } catch (error) {
            // Storage blocked: show the login form.
        }
        const field = form.querySelector('[data-js="field"]');
        const phone = form.querySelector('[data-js="phone"]');
        setupPhoneInput(phone);
        phone.addEventListener('input', () => setFieldError(field, ''));

        form.addEventListener('submit', (event) => {
            event.preventDefault();
            if (!isPhoneComplete(phone.value)) {
                setFieldError(field, phone.value ? 'Введіть номер повністю: +38 (0XX) XXX-XX-XX' : 'Введіть номер телефону');
                phone.focus();
                return;
            }
            openModal(modal, form.querySelector('[type="submit"]'));
        });
        modal.addEventListener('verify:success', () => {
            try {
                localStorage.setItem(AUTH_KEY, JSON.stringify({ phone: phone.value }));
            } catch (error) {
                // Storage can be blocked; the demo still continues.
            }
            window.location.href = form.getAttribute('action');
        });
        document.querySelectorAll('[data-js="google-login"]').forEach((button) => {
            button.addEventListener('click', () => {
                window.location.href = form.getAttribute('action');
            });
        });
    }

    // ----- logout and account deletion -----
    function logout() {
        try {
            localStorage.removeItem(AUTH_KEY);
        } catch (error) {
            // Ignore blocked storage.
        }
        window.location.href = 'account.html';
    }

    function initLogout() {
        document.querySelectorAll('[data-js="logout"]').forEach((button) => button.addEventListener('click', logout));
        document.querySelector('[data-js="account-delete-confirm"]')?.addEventListener('click', logout);
    }

    // ----- mobile account start screen: desktop shows the orders page instead -----
    function initCabinetHome() {
        if (document.querySelector('.cabinet-home') && window.matchMedia('(min-width: 1024px)').matches) {
            window.location.replace('orders.html');
        }
    }

    // ----- profile: contacts -----
    function setupContactField(box) {
        const input = box.querySelector('input');
        const action = box.querySelector('[data-js="contact-action"]');
        const isPhone = box.dataset.type === 'tel';
        let saved = input.value;
        if (isPhone) {
            setupPhoneInput(input);
        }

        const finish = () => {
            saved = input.value;
            input.readOnly = true;
            box.classList.remove('contact-field--editing');
            action.textContent = 'Змінити';
        };

        action.addEventListener('click', () => {
            if (input.readOnly) {
                input.readOnly = false;
                box.classList.add('contact-field--editing');
                action.textContent = 'Підтвердити';
                input.focus();
                input.select();
                return;
            }
            const valid = isPhone ? isPhoneComplete(input.value) : /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value.trim());
            if (!valid) {
                setFieldError(box, isPhone ? 'Введіть номер повністю: +38 (0XX) XXX-XX-XX' : 'Введіть коректний e-mail');
                input.focus();
                return;
            }
            setFieldError(box, '');
            if (isPhone && input.value !== saved) {
                const modal = document.getElementById('verify-modal');
                const onSuccess = () => {
                    modal.removeEventListener('verify:success', onSuccess);
                    closeModal(modal);
                    finish();
                };
                modal.addEventListener('verify:success', onSuccess);
                openModal(modal, action);
                return;
            }
            finish();
        });
        input.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && !input.readOnly) {
                input.value = saved;
                setFieldError(box, '');
                finish();
            } else if (event.key === 'Enter') {
                event.preventDefault();
                action.click();
            }
        });
    }

    // ----- profile: saved addresses -----
    function initAddresses() {
        const root = document.querySelector('[data-js="addresses"]');
        const modal = document.getElementById('address-modal');
        const confirmModal = document.getElementById('address-delete-modal');
        if (!root || !modal) {
            return;
        }
        const form = modal.querySelector('[data-js="address-form"]');
        const title = modal.querySelector('.modal__title');
        const mainList = root.querySelector('[data-js="address-main"]');
        const allList = root.querySelector('[data-js="address-all"]');
        const housing = form.querySelector('[data-js="housing-switch"]');
        const housingFields = form.querySelector('[data-js="housing-fields"]');
        let editing = null;
        let removing = null;

        const rowHtml = (text) => `<li class="addresses__item" data-js="address">
                        <button class="addresses__edit" type="button" aria-label="Редагувати адресу" data-js="address-edit"><svg width="18" height="18" aria-hidden="true"><use href="#icon-pencil"></use></svg></button>
                        <span class="addresses__text" data-js="address-text">${escapeHtml(text)}</span>
                        <button class="addresses__remove" type="button" aria-label="Видалити адресу" data-js="address-remove"><svg width="18" height="18" aria-hidden="true"><use href="#icon-trash"></use></svg></button>
                    </li>`;

        const syncHousing = () => {
            housingFields.hidden = housing.checked;
            housingFields.querySelectorAll('input').forEach((input) => {
                input.disabled = housing.checked;
            });
        };
        housing.addEventListener('change', syncHousing);

        const openForm = (row, opener) => {
            editing = row;
            form.reset();
            form.querySelectorAll('[data-js="field"]').forEach((field) => setFieldError(field, ''));
            title.textContent = row ? 'Редагувати адресу' : 'Додати адресу';
            if (row) {
                // Demo parsing of "м. Місто, вул. Вулиця 18а, кв. 28".
                const parts = row.querySelector('[data-js="address-text"]').textContent.split(',').map((part) => part.trim());
                const flat = parts.find((part) => part.startsWith('кв.'));
                const street = parts.find((part) => part.startsWith('вул.')) || '';
                form.elements.city.value = (parts.find((part) => part.startsWith('м.')) || '').replace(/^м\.\s*/, '');
                form.elements.street.value = street.replace(/^вул\.\s*/, '').replace(/\s+\S+$/, '');
                form.elements.house.value = (street.match(/\s(\S+)$/) || [])[1] || '';
                form.elements.flat.value = flat ? flat.replace(/^кв\.\s*/, '') : '';
                housing.checked = !flat;
                form.elements.main.checked = mainList.contains(row);
            }
            syncHousing();
            openModal(modal, opener);
        };

        root.addEventListener('click', (event) => {
            const row = event.target.closest('[data-js="address"]');
            if (event.target.closest('[data-js="address-add"]')) {
                openForm(null, event.target.closest('button'));
            } else if (event.target.closest('[data-js="address-edit"]')) {
                openForm(row, event.target.closest('button'));
            } else if (event.target.closest('[data-js="address-remove"]')) {
                removing = row;
                openModal(confirmModal, event.target.closest('button'));
            }
        });

        confirmModal?.querySelector('[data-js="address-delete-confirm"]').addEventListener('click', () => {
            removing?.remove();
            removing = null;
            closeModal(confirmModal, false);
            (root.querySelector('[data-js="address-add"]')).focus();
        });

        form.addEventListener('input', (event) => {
            const field = event.target.closest('[data-js="field"]');
            if (field) {
                setFieldError(field, '');
            }
        });

        form.addEventListener('submit', (event) => {
            event.preventDefault();
            let valid = true;
            form.querySelectorAll('[data-js="field"]').forEach((field) => {
                const input = field.querySelector('input');
                const empty = !input.value.trim();
                setFieldError(field, empty ? 'Заповніть поле' : '');
                if (empty && valid) {
                    input.focus();
                }
                valid = valid && !empty;
            });
            if (!valid) {
                return;
            }
            const { city, street, house, building, flat } = form.elements;
            let text = `м. ${city.value.trim()}, вул. ${street.value.trim()} ${house.value.trim()}`;
            if (!housing.checked && building.value.trim()) {
                text += `, корп. ${building.value.trim()}`;
            }
            if (!housing.checked && flat.value.trim()) {
                text += `, кв. ${flat.value.trim()}`;
            }
            if (editing) {
                editing.querySelector('[data-js="address-text"]').textContent = text;
            } else {
                allList.insertAdjacentHTML('beforeend', rowHtml(text));
            }
            if (form.elements.main.checked) {
                mainList.innerHTML = rowHtml(text);
            }
            editing = null;
            closeModal(modal);
        });
    }

    function initProfile() {
        document.querySelectorAll('[data-js="contact-field"]').forEach(setupContactField);
        document.querySelectorAll('.profile [data-js="datepicker"]').forEach(setupDatepicker);
        initAddresses();
    }

    // ----- settings: remembered in localStorage -----
    function initSettings() {
        const form = document.querySelector('[data-js="settings"]');
        if (!form) {
            return;
        }
        let state = {};
        try {
            state = JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {};
        } catch (error) {
            state = {};
        }
        form.querySelectorAll('input[type="checkbox"]').forEach((input) => {
            input.checked = Boolean(state[input.name]);
        });
        form.addEventListener('change', (event) => {
            state[event.target.name] = event.target.checked;
            try {
                localStorage.setItem(SETTINGS_KEY, JSON.stringify(state));
            } catch (error) {
                // Ignore blocked storage.
            }
        });
    }

    // ----- favourites: un-hearting removes the card -----
    function initFavoritesPage() {
        const root = document.querySelector('[data-js="favorites"]');
        if (!root) {
            return;
        }
        const empty = root.querySelector('[data-js="favorites-empty"]');
        root.addEventListener('click', (event) => {
            const button = event.target.closest('[data-js="favorite-toggle"]');
            // Runs before the document-level toggle: a pressed heart here means "remove".
            if (!button || button.getAttribute('aria-pressed') !== 'true') {
                return;
            }
            event.stopPropagation();
            button.closest('.product-grid__item').remove();
            const left = root.querySelectorAll('.product-grid__item').length;
            empty.hidden = left > 0;
            root.querySelector('.product-grid').hidden = left === 0;
            document.querySelectorAll('a[href="favorites.html"] .cabinet-menu__badge').forEach((badge) => {
                badge.querySelector('[data-js="badge-count"]').textContent = left;
                badge.hidden = left === 0;
            });
        });
    }

    // ==========================================================================
    // blog
    // ==========================================================================

    // Article like: toggles the counter (frontend demo, no persistence).
    function initArticleLike() {
        const button = document.querySelector('[data-js="article-like"]');
        if (!button) {
            return;
        }
        const count = button.querySelector('[data-js="article-like-count"]');
        const base = Number(count.textContent);
        button.addEventListener('click', () => {
            const pressed = button.getAttribute('aria-pressed') !== 'true';
            const value = base + (pressed ? 1 : 0);
            button.setAttribute('aria-pressed', String(pressed));
            button.setAttribute('aria-label', `${pressed ? 'Прибрати вподобання' : 'Вподобати статтю'}, ${value} вподобань`);
            count.textContent = value;
        });
    }

    // ==========================================================================
    // thanks
    // ==========================================================================

    // Success popup (Figma: thx_popup) with a custom title and text.
    function showThanks(title, text, opener) {
        const modal = document.getElementById('thanks-modal');
        if (!modal) {
            return;
        }
        modal.querySelector('[data-js="thanks-title"]').textContent = title;
        modal.querySelector('[data-js="thanks-text"]').textContent = text;
        openModal(modal, opener);
        modal.querySelector('.modal__close').focus();
    }

    // ==========================================================================
    // feedback
    // ==========================================================================

    // Contacts page callback form: client-side validation only (frontend demo).
    function initFeedback() {
        const form = document.querySelector('[data-js="feedback"]');
        if (!form) {
            return;
        }
        const phone = form.querySelector('[data-js="phone"]');
        setupPhoneInput(phone);

        form.addEventListener('input', (event) => {
            const field = event.target.closest('[data-js="field"]');
            if (field) {
                setFieldError(field, '');
            }
        });

        form.addEventListener('submit', (event) => {
            event.preventDefault();
            let firstInvalid = null;
            form.querySelectorAll('[data-js="field"]').forEach((field) => {
                const control = field.querySelector('input, textarea');
                let message = '';
                if (!control.value.trim()) {
                    message = 'Заповніть поле';
                } else if (control === phone && !isPhoneComplete(phone.value)) {
                    message = 'Введіть номер повністю: +38 (0XX) XXX-XX-XX';
                }
                setFieldError(field, message);
                if (message && !firstInvalid) {
                    firstInvalid = control;
                }
            });
            if (firstInvalid) {
                firstInvalid.focus();
                return;
            }
            form.reset();
            showThanks('Дякуємо за звернення!', "Ми зв'яжемося з вами найближчим часом.", form.querySelector('[type="submit"]'));
        });
    }

    // ==========================================================================
    // tabs
    // ==========================================================================

    // Accessible tabs (About page). Each tab controls its panel via aria-controls; tabs that
    // share one panel (data-tabs-shared) only switch the active state.
    function setupTabs(root) {
        const tabs = [...root.querySelectorAll('[data-js="tab"]')];
        const select = (tab, focus = false) => {
            tabs.forEach((item) => {
                const active = item === tab;
                item.setAttribute('aria-selected', String(active));
                item.tabIndex = active ? 0 : -1;
                const text = item.parentElement.querySelector('[data-js="tab-text"]');
                if (text) {
                    text.hidden = !active;
                }
                if (!('tabsShared' in root.dataset)) {
                    document.getElementById(item.getAttribute('aria-controls')).hidden = !active;
                }
            });
            if ('tabsShared' in root.dataset) {
                root.querySelector('[data-js="tab-panel"]').setAttribute('aria-labelledby', tab.id);
            }
            if (focus) {
                tab.focus();
            }
        };
        root.addEventListener('click', (event) => {
            const tab = event.target.closest('[data-js="tab"]');
            if (tab) {
                select(tab);
            }
        });
        root.addEventListener('keydown', (event) => {
            const index = tabs.indexOf(document.activeElement);
            if (index === -1) {
                return;
            }
            const keys = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
            if (event.key in keys) {
                event.preventDefault();
                select(tabs[(index + keys[event.key] + tabs.length) % tabs.length], true);
            } else if (event.key === 'Home' || event.key === 'End') {
                event.preventDefault();
                select(tabs[event.key === 'Home' ? 0 : tabs.length - 1], true);
            }
        });
    }

    // History timeline: vertical wheel scrolls it sideways until an end is reached; drag to scroll.
    function setupTimeline(list) {
        list.addEventListener('wheel', (event) => {
            if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) {
                return;
            }
            const max = list.scrollWidth - list.clientWidth;
            const atEnd = (event.deltaY > 0 && list.scrollLeft >= max - 1) || (event.deltaY < 0 && list.scrollLeft <= 0);
            if (!atEnd) {
                event.preventDefault();
                list.scrollLeft += event.deltaY;
            }
        }, { passive: false });

        let startX = 0;
        let startScroll = 0;
        let dragging = false;
        list.addEventListener('pointerdown', (event) => {
            if (event.pointerType !== 'mouse') {
                return;
            }
            dragging = true;
            startX = event.clientX;
            startScroll = list.scrollLeft;
            list.classList.add('is-dragging');
        });
        window.addEventListener('pointermove', (event) => {
            if (dragging) {
                list.scrollLeft = startScroll - (event.clientX - startX);
            }
        });
        window.addEventListener('pointerup', () => {
            dragging = false;
            list.classList.remove('is-dragging');
        });
    }

    function initAbout() {
        document.querySelectorAll('[data-js="tabs"]').forEach(setupTabs);
        document.querySelectorAll('[data-js="timeline"]').forEach(setupTimeline);
    }

    // ==========================================================================
    // engraving
    // ==========================================================================

    // Engraving configurator popup. On the product page the result is attached to the next
    // "Купити"; on the engraving page (data-contacts) it is a standalone request with contacts.
    const ENGRAVING_PRICES = { text: 350, image: 400 };
    const ENGRAVING_SAMPLES = { uk: 'Слава Україні! Героям слава!', en: 'Glory to Ukraine! Glory to heroes!' };
    const ENGRAVING_MAX_FILE = 10 * 1024 * 1024;
    let pageEngraving = null;

    function setupFontSelect(select, onChange) {
        const toggle = select.querySelector('[data-js="font-toggle"]');
        const list = select.querySelector('[data-js="font-list"]');
        const value = select.querySelector('[data-js="font-value"]');
        const options = [...list.querySelectorAll('[data-js="font-option"]')];
        let current = null;

        const close = (focus = false) => {
            list.hidden = true;
            toggle.setAttribute('aria-expanded', 'false');
            if (focus) {
                toggle.focus();
            }
        };
        const open = () => {
            list.hidden = false;
            toggle.setAttribute('aria-expanded', 'true');
            (options.find((option) => option.getAttribute('aria-selected') === 'true') || options[0]).focus();
        };
        const choose = (font) => {
            current = font;
            options.forEach((option) => option.setAttribute('aria-selected', String(option.dataset.font === font)));
            value.textContent = font || 'Оберіть шрифт';
            value.style.setProperty('--font', font ? `'${font}'` : 'inherit');
            onChange(font);
        };

        toggle.addEventListener('click', () => (list.hidden ? open() : close()));
        list.addEventListener('click', (event) => {
            const option = event.target.closest('[data-js="font-option"]');
            if (option) {
                choose(option.dataset.font);
                close(true);
            }
        });
        list.addEventListener('keydown', (event) => {
            const index = options.indexOf(document.activeElement);
            if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                event.preventDefault();
                options[(index + (event.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length].focus();
            } else if ((event.key === 'Enter' || event.key === ' ') && index !== -1) {
                event.preventDefault();
                choose(options[index].dataset.font);
                close(true);
            } else if (event.key === 'Escape') {
                event.stopPropagation();
                close(true);
            }
        });
        document.addEventListener('click', (event) => {
            if (!select.contains(event.target)) {
                close();
            }
        });
        return { choose, get: () => current, close };
    }

    function initEngraving() {
        const modal = document.getElementById('engraving-modal');
        if (!modal) {
            return;
        }
        const form = modal.querySelector('[data-js="engraver"]');
        const textPart = form.querySelector('[data-js="engraver-text"]');
        const imagePart = form.querySelector('[data-js="engraver-image"]');
        const contacts = form.querySelector('[data-js="engraver-contacts"]');
        const price = form.querySelector('[data-js="engraver-price"]');
        const input = form.querySelector('[data-js="engraver-input"]');
        const count = form.querySelector('[data-js="engraver-count"]');
        const link = form.querySelector('[data-js="engraver-link"]');
        const upload = form.querySelector('[data-js="upload-field"]');
        const fileInput = form.querySelector('[data-js="upload-input"]');
        const fileName = form.querySelector('[data-js="upload-name"]');
        const fileRemove = form.querySelector('[data-js="upload-remove"]');
        const fontBox = form.querySelector('[data-js="font-select"]');
        const preview = document.getElementById('font-preview-modal');
        let withContacts = false;

        const fonts = setupFontSelect(fontBox, () => setFieldError(fontBox, ''));
        setupPhoneInput(form.querySelector('[data-js="phone"]'));

        const type = () => form.elements['engraving-type'].value;
        const lang = () => form.elements['engraving-lang'].value;
        const updateType = () => {
            const isText = type() === 'text';
            textPart.hidden = !isText;
            imagePart.hidden = isText;
            price.textContent = formatMoney(ENGRAVING_PRICES[type()]);
        };
        const updateLang = () => {
            const sample = ENGRAVING_SAMPLES[lang()];
            modal.querySelectorAll('[data-js="font-sample"]').forEach((node) => {
                node.textContent = sample;
            });
            preview.querySelector('[data-js="font-preview-sample"]').textContent = sample;
        };
        const updateCount = () => {
            count.textContent = `${input.value.length}/30`;
        };
        const clearFile = () => {
            fileInput.value = '';
            fileName.textContent = 'Вибрати зображення на пристрої';
            fileRemove.hidden = true;
        };
        const reset = (opener) => {
            form.reset();
            fonts.choose(null);
            clearFile();
            form.querySelectorAll('.field--invalid').forEach((field) => setFieldError(field, ''));
            setFieldError(upload, '');
            withContacts = 'contacts' in opener.dataset;
            contacts.hidden = !withContacts;
            contacts.disabled = !withContacts;
            form.elements['engraving-type'].value = opener.dataset.type === 'image' ? 'image' : 'text';
            // Re-open with the engraving already chosen on the product page.
            if (!withContacts && pageEngraving) {
                form.elements['engraving-type'].value = pageEngraving.type;
                if (pageEngraving.type === 'text') {
                    form.elements['engraving-lang'].value = pageEngraving.lang === 'Англійська' ? 'en' : 'uk';
                    fonts.choose(pageEngraving.font);
                    input.value = pageEngraving.text;
                } else if (pageEngraving.link) {
                    link.value = pageEngraving.link;
                }
            }
            updateType();
            updateLang();
            updateCount();
        };

        document.addEventListener('click', (event) => {
            const opener = event.target.closest('[data-js="engraving-open"]');
            if (opener) {
                reset(opener);
                openModal(modal, opener);
            }
        });

        form.addEventListener('change', (event) => {
            if (event.target.matches('[data-js="engraver-type"]')) {
                updateType();
            } else if (event.target.matches('[data-js="engraver-lang"]')) {
                updateLang();
            }
        });
        form.addEventListener('input', (event) => {
            const field = event.target.closest('[data-js="field"]');
            if (field) {
                setFieldError(field, '');
            }
            if (event.target === input) {
                updateCount();
            }
            if (event.target === link) {
                setFieldError(upload, '');
            }
        });

        fileInput.addEventListener('change', () => {
            const file = fileInput.files[0];
            setFieldError(upload, '');
            if (!file) {
                clearFile();
                return;
            }
            if (file.size > ENGRAVING_MAX_FILE) {
                clearFile();
                setFieldError(upload, 'Файл більший за 10 мб');
                return;
            }
            fileName.textContent = file.name;
            fileRemove.hidden = false;
        });
        fileRemove.addEventListener('click', () => {
            clearFile();
            fileInput.focus();
        });

        // Font preview popup (magnifier next to each font)
        let previewFont = null;
        modal.addEventListener('click', (event) => {
            const button = event.target.closest('[data-js="font-preview"]');
            if (!button) {
                return;
            }
            previewFont = button.dataset.font;
            preview.querySelector('[data-js="font-preview-name"]').textContent = previewFont;
            preview.querySelector('[data-js="font-preview-sample"]').style.fontFamily = `'${previewFont}', var(--font-body)`;
            fonts.close();
            openModal(preview, button, { stack: true });
        });
        preview.querySelector('[data-js="font-preview-choose"]').addEventListener('click', () => {
            fonts.choose(previewFont);
            closeModal(preview, false);
            fontBox.querySelector('[data-js="font-toggle"]').focus();
        });

        form.addEventListener('submit', (event) => {
            event.preventDefault();
            const errors = [];
            const fail = (field, message) => {
                setFieldError(field, message);
                errors.push(field);
            };
            if (type() === 'text') {
                if (!fonts.get()) {
                    fail(fontBox, 'Оберіть шрифт');
                }
                if (!input.value.trim()) {
                    fail(input.closest('[data-js="field"]'), 'Введіть текст для гравіювання');
                }
            } else {
                const hasFile = fileInput.files.length > 0;
                const url = link.value.trim();
                if (url && !/^https?:\/\/\S+\.\S+/.test(url)) {
                    fail(link.closest('[data-js="field"]'), 'Вставте коректне посилання');
                } else if (!hasFile && !url) {
                    fail(upload, 'Завантажте зображення або вставте посилання');
                }
            }
            if (withContacts) {
                const name = form.elements.name;
                const phone = form.elements.phone;
                if (!name.value.trim()) {
                    fail(name.closest('[data-js="field"]'), 'Вкажіть ім’я');
                }
                if (!isPhoneComplete(phone.value)) {
                    fail(phone.closest('[data-js="field"]'), 'Введіть номер повністю: +38 (0XX) XXX-XX-XX');
                }
            }
            if (errors.length) {
                (errors[0].querySelector('input, button') || errors[0]).focus();
                return;
            }

            if (withContacts) {
                closeModal(modal, false);
                showThanks('Заявку на гравіювання прийнято', "Менеджер зв'яжеться з вами, щоб погодити макет гравіювання.", modalOpeners.get(modal));
                return;
            }
            pageEngraving = type() === 'text'
                ? { type: 'text', text: input.value.trim(), font: fonts.get(), lang: lang() === 'en' ? 'Англійська' : 'Українська', price: ENGRAVING_PRICES.text }
                : { type: 'image', file: fileInput.files[0]?.name || link.value.trim().split('/').pop(), link: link.value.trim(), price: ENGRAVING_PRICES.image };
            document.querySelectorAll('[data-js="engraving-open"]').forEach((button) => {
                button.setAttribute('aria-pressed', String(button.dataset.type === pageEngraving.type));
            });
            closeModal(modal);
        });
    }

    // ==========================================================================
    // review-photos
    // ==========================================================================

    // Customer photo viewer: big photo with arrows plus the review it belongs to.
    const REVIEW_PHOTO_2X = { 5: 552 };

    function initReviewPhotos() {
        const modal = document.getElementById('review-photo-modal');
        if (!modal) {
            return;
        }
        const media = modal.querySelector('[data-js="viewer-media"]');
        const review = modal.querySelector('[data-js="viewer-review"]');
        const status = modal.querySelector('[data-js="viewer-status"]');
        const prev = modal.querySelector('[data-js="viewer-prev"]');
        const next = modal.querySelector('[data-js="viewer-next"]');
        let photos = [];
        let index = 0;
        let source = null;

        const show = (i) => {
            index = (i + photos.length) % photos.length;
            const n = photos[index];
            const big = REVIEW_PHOTO_2X[n] || 666;
            const base = `assets/images/product/review-${n}-full`;
            media.innerHTML = `<picture><img class="photo-viewer__image" src="${base}-333.webp" srcset="${base}-333.webp 333w, ${base}-${big}.webp ${big}w" sizes="333px" width="333" height="425" alt="Фото з відгуку ${index + 1} з ${photos.length}"></picture>`;
            status.textContent = `Фото ${index + 1} з ${photos.length}`;
            prev.hidden = photos.length < 2;
            next.hidden = photos.length < 2;
        };
        const renderReview = () => {
            const clone = source.cloneNode(true);
            clone.querySelector('.review__photos')?.remove();
            clone.classList.add('review--viewer');
            clone.querySelectorAll('[id]').forEach((node) => node.removeAttribute('id'));
            review.replaceChildren(clone);
        };

        document.addEventListener('click', (event) => {
            const button = event.target.closest('[data-js="review-photo"]');
            if (!button || modal.contains(button)) {
                return;
            }
            source = button.closest('.review');
            const buttons = [...source.querySelectorAll('[data-js="review-photo"]')];
            photos = buttons.map((item) => item.dataset.photo);
            renderReview();
            show(buttons.indexOf(button));
            openModal(modal, button);
        });
        prev.addEventListener('click', () => show(index - 1));
        next.addEventListener('click', () => show(index + 1));
        modal.addEventListener('keydown', (event) => {
            if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
                show(index + (event.key === 'ArrowRight' ? 1 : -1));
            }
        });
        // "Корисний відгук" inside the viewer drives the original review's button.
        review.addEventListener('click', (event) => {
            if (event.target.closest('[data-js="review-like"]')) {
                event.stopPropagation();
                source.querySelector('[data-js="review-like"]').click();
                renderReview();
                review.querySelector('[data-js="review-like"]').focus();
            }
        });
    }

    function initAccount() {
        document.querySelectorAll('#verify-modal').forEach(setupVerify);
        initAuth();
        initLogout();
        initCabinetHome();
        initProfile();
        initSettings();
        initFavoritesPage();
    }

    // ==========================================================================
    // Start
    // ==========================================================================

    initSliders();
    initDrawers();
    initSort();
    initRanges();
    initSearch();
    initCart();
    initProductCards();
    initHeroVideo();
    initCounters();
    initGalleries();
    initProductPage();
    initCheckout();
    initTabbar();
    initOrderResult();
    initModals();
    initAccount();
    initArticleLike();
    initFeedback();
    initAbout();
    initEngraving();
    initReviewPhotos();
})();
