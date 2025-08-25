import { productsA, productsB } from "./products.js";

let products = productsA; // default to productsA
let currentBrand = 'bread';

/* ==========================================
    CONFIG — update these for the real client
    ========================================== */
    const CONFIG = {
        brandName: 'bread',   // replace with actual brand name
        currency: 'ZAR',              // currency code
        whatsappBusinessNumber: '',   // E.164 format like '+27XXXXXXXXX' (if set, we open direct chat)
        seller:{
            name: 'bread (MVP)',
            email: 'orders@example.com', // for later email integration
            vatRate: 0.15,               // 15% VAT example (adjust or set to 0)
            location: 'South Africa'
        },
        email: {                      // Optional EmailJS / serverless later
            provider: 'emailjs',        // placeholder
            serviceId: '',              // add when ready
            templateId: '',             // add when ready
            publicKey: ''               // add when ready
        }
    };

    document.getElementById("brandSwitch").addEventListener("change", (e) => {
        switchBrand(e.target.checked);
    });
    document.getElementById('brandMark').textContent = CONFIG.brandName;
    document.getElementById('brand').textContent = CONFIG.brandName;
    document.getElementById('year').textContent = new Date().getFullYear();

    /* ==========================================
       UTILITIES
       ========================================== */
    const fmt = (n) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency: CONFIG.currency }).format(n);
    const $ = (sel) => document.querySelector(sel);
    const el = (tag, attrs={}, ...children) => {
        const node = document.createElement(tag);
        Object.entries(attrs).forEach(([k,v])=>{
            if(k.startsWith('on') && typeof v === 'function') node.addEventListener(k.substring(2), v);
            else if(k==='class') node.className = v; else if(k==='html') node.innerHTML = v; else node.setAttribute(k,v);
            });
        children.forEach(c=> node.append(c));
        return node;
    };

    /* ==========================================
       RENDER: PRODUCTS GRID
       ========================================== */
    function renderProducts(){
        const grid = document.getElementById('catalog');
        grid.innerHTML = '';
        products.forEach(p=>{
            const card = el('article', { class:'card product-card', 'data-id':p.id });
            const img = el('div', { class:'thumb' }, el('img', { src:p.image, alt:p.name }));
            const info = el('div', { class:'info' });
            info.append(
                    el('div', { class:'title' }, p.name),
                    el('div', { class:'price' }, fmt(p.price)),
                    el('div', { class:'add' },
                        el('button', { class:'btn btn-primary', onclick: ()=> addToCart(p.id) }, 'Add to cart'),
                        el('button', { class:'btn btn-ghost', onclick: ()=> quickView(p) }, 'Details')
                    )
            );
            card.append(img, info);
            grid.append(card);
        });
    }

    function quickView(p){
        const dlg = document.getElementById('productModal');
        if(!dlg){ showToast('Product modal missing'); return; }

        $('#pmTitle').textContent = p.name;
        const img = $('#pmImg');
        img.src = p.image; img.alt = p.name;

        $('#pmDesc').textContent = p.description || 'No description available.';
        $('#pmPrice').textContent = fmt(p.price);

        $('#pmAdd').onclick = ()=> { addToCart(p.id); dlg.close(); };
        $('#pmClose').onclick = ()=> dlg.close();

        dlg.addEventListener('click', (e)=>{
            const rect = dlg.querySelector('article').getBoundingClientRect();
            const inside = e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom;
            if(!inside) dlg.close();
        }, { once:true });

        dlg.showModal();
    }



    /* ==========================================
       CART STATE (localStorage)
       ========================================== */
    const CART_KEY = 'glitch_cart_v1';
    let cart = loadCart();
    sanitizeCart();

    function loadCart(){
        try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; }
        catch { return []; }
    }
    function saveCart(){ localStorage.setItem(CART_KEY, JSON.stringify(cart)); }

    function sanitizeCart(){
        const validIds = new Set(products.map(p => p.id));
        cart = cart
            .filter(l => validIds.has(l.id))
            .map(l => ({ id: l.id, qty: Math.max(1, Number(l.qty) || 1) }));
        saveCart();
    }
    function addToCart(id, qty=1){
        const p = products.find(x => x.id === id);
        if(!p){ 
            console.warn('addToCart: product not found', id); 
            showToast('Item not available'); 
            return; 
        }
        const line = cart.find(l => l.id === id);
        if(line) { line.qty += qty; }
        else { cart.push({ id, qty }); }

        saveCart();
        renderCart();
        showToast('Added to cart');
    }
    function setQty(id, qty) {
        qty = parseInt(qty, 10);  // force to number
        if (isNaN(qty) || qty < 1) qty = 1;

        const item = cart.find(l => l.id === id);
        if(item){ 
            item.qty = qty; 
            saveCart(); 
            renderCart(); 
        }
    }
    function removeLine(id){
        cart = cart.filter(item => item.id !== id);
        renderCart();
    }
    function clearCart(){ cart = []; saveCart(); renderCart(); }

    function cartTotals(){
        let subtotal = 0;
        const lines = [];

        for(const l of cart){
            const p = products.find(x => x.id === l.id);
            if(!p) continue; // skip unknown IDs safely

            const lineTotal = p.price * l.qty;
            subtotal += lineTotal;
            lines.push({
                ...l,
                name: p.name,
                price: p.price,
                sku: p.sku || '',
                image: p.image,
                lineTotal
            });
        }
        const vat = CONFIG.seller.vatRate ? subtotal * CONFIG.seller.vatRate : 0;
        const total = subtotal + vat;
        return { lines, subtotal, vat, total };
    }   

    function renderCart(){
        const totals = cartTotals();
        const lines = totals.lines || [];

        const countEl = document.getElementById('cartCount');
        const totalEl = document.getElementById('cartTotal');
        if (countEl) countEl.textContent = cart.reduce((a,b)=> a + (Number(b.qty)||0), 0);
        if (totalEl) totalEl.textContent = fmt(totals.subtotal);

        const box = document.getElementById('cartLines');
        if(!box) return; // not on this page

        box.innerHTML = '';
        if(lines.length === 0){
            box.append(el('p', { class:'help'}, 'Your cart is empty.'));
            return;
        }

        lines.forEach(l=>{
            const pimg = el('img', { src:l.image, alt:l.name, style:'width:56px;height:56px;object-fit:cover;border-radius:8px;border:1px solid #222' });
            const title = el('div', {}, 
                el('div', { class:'title'}, l.name), 
                el('div', { class:'help'}, `${fmt(l.price)} · ${l.sku}`)
            );
            const qty = el('div', { class:'qty' },
                el('button', { onclick:()=> setQty(l.id, l.qty-1) }, '−'),
                el('input', { value:l.qty, readOnly: true }),
                el('button', { onclick:()=> setQty(l.id, l.qty+1) }, '+')
            );
            const rm = el('button', { class:'btn', onclick:()=> removeLine(l.id) }, 'Remove');
            const line = el('div', { class:'line' });
            line.append(pimg, title, el('div', {}, qty, el('div', { class:'help', style:'text-align:right;margin-top:6px'}, fmt(l.lineTotal)), rm));
            box.append(line);
        });
    }

    function switchBrand(isButter) {
        if (isButter) {
            products = productsB;
            currentBrand = 'butter';
            document.body.classList.add('brand-butter');
            document.body.classList.remove('brand-bread');
            showToast('Switched to Butter Brand');
        } else {
            products = productsA;
            currentBrand = 'bread';
            document.body.classList.add('brand-bread');
            document.body.classList.remove('brand-butter');
            showToast('Switched to Bread Brand');
        }
        renderProducts();
        renderCart();
    }


    /* ==========================================
       CHECKOUT — Invoice + WhatsApp + Email stub
       ========================================== */
    function openCheckout(){ document.getElementById('checkoutModal').showModal(); }

    async function handleCheckoutSubmit(e){
        e.preventDefault();
        const form = document.getElementById('checkoutForm');
        const data = Object.fromEntries(new FormData(form).entries());
        const orderId = 'GS' + Date.now();
        const totals = cartTotals();
        if(!totals.lines.length){ showToast('Cart is empty'); return; }
        const pdfBlob = await generateInvoicePDF(orderId, data, totals);
        downloadBlob(pdfBlob, `invoice-${orderId}.pdf`);
        openWhatsApp(orderId, data, totals);
        // Optional: send confirmation email later
        // await sendOrderEmail(orderId, data, totals);
        form.closest('dialog').close();
        clearCart();
    }

    function downloadBlob(blob, filename){
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = filename; a.click();
        URL.revokeObjectURL(url);
    }

    async function generateInvoicePDF(orderId, customer, totals){
        // Use jsPDF; fall back to simple text blob if unavailable
        try{
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            const line = (y)=> doc.line(14,y,196,y);
            let y = 16;
            doc.setFont('helvetica','bold'); doc.setFontSize(18);
            doc.text(CONFIG.brandName + ' — Invoice', 14, y); y += 6;
            doc.setFont('helvetica','normal'); doc.setFontSize(11);
            doc.text(`Order: ${orderId}`, 14, y); y += 6;
            doc.text(`Date: ${new Date().toLocaleString()}`, 14, y); y += 10;

            doc.text('Sold by:', 14, y); doc.text(`${CONFIG.seller.name}`, 40, y); y += 6;
            doc.text('Email:', 14, y); doc.text(`${CONFIG.seller.email}`, 40, y); y += 10;

            doc.text('Bill to:', 14, y); doc.text(`${customer.name}`, 40, y); y += 6;
            doc.text('Email:', 14, y); doc.text(`${customer.email}`, 40, y); y += 6;
            doc.text('WhatsApp:', 14, y); doc.text(`${customer.phone}`, 40, y); y += 8; line(y); y += 8;

            doc.setFont('helvetica','bold'); doc.text('Items', 14, y); y += 8; doc.setFont('helvetica','normal');
            totals.lines.forEach(l=>{
                doc.text(`${l.name} (${l.sku}) x${l.qty}`, 14, y);
                doc.text(fmt(l.lineTotal), 170, y, { align:'right' });
                y += 6;
            });
            y += 6; line(y); y += 8;
            doc.text('Subtotal', 150, y); doc.text(fmt(totals.subtotal), 190, y, { align:'right' }); y += 6;
            doc.text('VAT', 150, y); doc.text(fmt(totals.vat), 190, y, { align:'right' }); y += 6;
            doc.setFont('helvetica','bold'); doc.text('Total', 150, y); doc.text(fmt(totals.total), 190, y, { align:'right' }); y += 10;

            doc.setFont('helvetica','normal'); doc.setFontSize(10);
            doc.text('Payment will be arranged via WhatsApp. Include the Order ID in your message.', 14, y);
            return doc.output('blob');
        }catch(err){
            console.warn('jsPDF not available, falling back', err);
            const txt = `Invoice ${orderId}\n\n` + JSON.stringify({ customer, totals }, null, 2);
            return new Blob([txt], { type:'text/plain' });
        }
    }

    function openWhatsApp(orderId, customer, totals){
        const lines = totals.lines.map(l=>`• ${l.name} x${l.qty} — ${fmt(l.lineTotal)}`).join('%0A');
        const msg = `Hi! I want to pay for my order.%0A%0AOrder ID: ${orderId}%0AName: ${encodeURIComponent(customer.name)}%0AEmail: ${encodeURIComponent(customer.email)}%0A%0AItems:%0A${lines}%0A%0ATotal: ${fmt(totals.total)}%0A`;
        const base = CONFIG.whatsappBusinessNumber ? `https://wa.me/${CONFIG.whatsappBusinessNumber.replace(/[^\d]/g,'')}` : 'https://wa.me/';
        window.open(`${base}?text=${msg}`, '_blank');
    }

    async function sendOrderEmail(orderId, customer, totals){
        // Placeholder for EmailJS/Netlify. Leaving here for next integration step.
        // Example EmailJS (requires keys in CONFIG.email):
        // emailjs.init(CONFIG.email.publicKey);
        // await emailjs.send(CONFIG.email.serviceId, CONFIG.email.templateId, { orderId, ...customer, json: JSON.stringify(totals) });
        console.log('Email stub:', { orderId, customer, totals });
    }

    /* ==========================================
       UI WIRING
       ========================================== */
    renderProducts();
    renderCart();

    document.getElementById('quickAdd').addEventListener('click', ()=> addToCart('5'));
    const overlay = document.getElementById('overlay');
    const drawer  = document.getElementById('cartDrawer');
    const openBtn = document.getElementById('openCartBtn');
    const closeBtn= document.getElementById('closeCartBtn');

    function openCart(){ overlay.classList.add('show'); drawer.classList.add('show'); openBtn.setAttribute('aria-expanded','true'); }
    function closeCart(){ overlay.classList.remove('show'); drawer.classList.remove('show'); openBtn.setAttribute('aria-expanded','false'); }

    openBtn.addEventListener('click', openCart);
    closeBtn.addEventListener('click', closeCart);
    overlay.addEventListener('click', closeCart);
    document.addEventListener('keydown', (e)=>{ if(e.key==='Escape') closeCart(); });

    document.getElementById('clearBtn').addEventListener('click', clearCart);
    document.getElementById('checkoutBtn').addEventListener('click', ()=>{
        if(!cart.length){ showToast('Your cart is empty'); return; }
        openCheckout();
    });
    document.getElementById('checkoutForm').addEventListener('submit', handleCheckoutSubmit);

    function showToast(text){
        const t = document.getElementById('toast');
        t.textContent = text; t.classList.add('show');
        setTimeout(()=> t.classList.remove('show'), 1400);
    }