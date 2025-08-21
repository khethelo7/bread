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

    document.getElementById('brandMark').textContent = CONFIG.brandName;
    document.getElementById('brand').textContent = CONFIG.brandName;
    document.getElementById('year').textContent = new Date().getFullYear();

    /* ==========================================
       SAMPLE DATA — 5 placeholder products
       ========================================== */
    const products = [
        { id:'tee-black',  name:'Core Tee — Black',  price: 350,  sku:'GS-TEE-BLK',  image:'https://placehold.co/800x1066/0f0f0f/FFF/png?text=CORE+TEE+BLACK' },
        { id:'tee-white',  name:'Core Tee — White',  price: 350,  sku:'GS-TEE-WHT',  image:'https://placehold.co/800x1066/111/EEE/png?text=CORE+TEE+WHITE' },
        { id:'hoodie',     name:'Heavy Hoodie',      price: 790,  sku:'GS-HOOD-001', image:'https://placehold.co/800x1066/121212/F4F4F4/png?text=HEAVY+HOODIE' },
        { id:'skirt',      name:'High‑waisted Skirt',price: 560,  sku:'GS-SKRT-001', image:'https://placehold.co/800x1066/0e0e0e/EEE/png?text=SKIRT' },
        { id:'jacket',     name:'Denim Jacket',      price: 920,  sku:'GS-JKT-001',  image:'https://placehold.co/800x1066/151515/EDEDED/png?text=DENIM+JACKET' },
    ];

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
        const grid = document.getElementById('productGrid');
        grid.innerHTML = '';
        products.forEach(p=>{
            const card = el('article', { class:'card', 'data-id':p.id });
            const img = el('div', { class:'thumb' }, el('img', { src:p.image, alt:p.name }));
            const info = el('div', { class:'info' });
            info.append(
                    el('div', { class:'title' }, p.name),
                    el('div', { class:'price' }, fmt(p.price)),
                    el('div', { class:'add' },
                        el('button', { class:'btn btn-primary', onClick: ()=> addToCart(p.id) }, 'Add to cart'),
                        el('button', { class:'btn btn-ghost', onClick: ()=> quickView(p) }, 'Details')
                    )
            );
            card.append(img, info);
            grid.append(card);
        });
    }

    function quickView(p){
        showToast(`${p.name} — R${p.price} (SKU ${p.sku})`);
    }

    /* ==========================================
       CART STATE (localStorage)
       ========================================== */
    const CART_KEY = 'glitch_cart_v1';
    let cart = loadCart();

    function loadCart(){
        try{ return JSON.parse(localStorage.getItem(CART_KEY)) || []; }catch{ return []; }
    }
    function saveCart(){ localStorage.setItem(CART_KEY, JSON.stringify(cart)); }

    function addToCart(id, qty=1){
        const item = cart.find(l=> l.id === id);
        if(item) item.qty += qty; else cart.push({ id, qty });
        saveCart();
        renderCart();
        showToast('Added to cart');
    }
    function setQty(id, qty){
        const item = cart.find(l=> l.id === id);
        if(item){ item.qty = Math.max(1, qty|0); saveCart(); renderCart(); }
    }
    function removeLine(id){ cart = cart.filter(l=> l.id !== id); saveCart(); renderCart(); }
    function clearCart(){ cart = []; saveCart(); renderCart(); }

    function cartTotals(){
        let subtotal = 0;
        const lines = cart.map(l=>{
            const p = products.find(x=> x.id === l.id);
            const lineTotal = p.price * l.qty;
            subtotal += lineTotal;
            return { ...l, name:p.name, price:p.price, sku:p.sku, image:p.image, lineTotal };
        });
      const vat = CONFIG.seller.vatRate ? subtotal * CONFIG.seller.vatRate : 0;
      const total = subtotal + vat;
      return { lines, subtotal, vat, total };
    }

    function renderCart(){
        const { lines, subtotal } = cartTotals();
        document.getElementById('cartCount').textContent = cart.reduce((a,b)=>a+b.qty,0);
        document.getElementById('cartTotal').textContent = fmt(subtotal);
        const box = document.getElementById('cartLines');
        box.innerHTML = '';
        if(!lines.length){
            box.append(el('p', { class:'help'}, 'Your cart is empty.'));
            return;
        }
        lines.forEach(l=>{
                const pimg = el('img', { src:l.image, alt:l.name, style:'width:56px;height:56px;object-fit:cover;border-radius:8px;border:1px solid #222' });
                const title = el('div', {}, el('div', { class:'title'}, l.name), el('div', { class:'help'}, `${fmt(l.price)} · ${l.sku}`));
                const qty = el('div', { class:'qty' },
                    el('button', { onClick:()=> setQty(l.id, l.qty-1) }, '−'),
                    el('input', { value:l.qty, onInput:(e)=> setQty(l.id, e.target.value) }),
                    el('button', { onClick:()=> setQty(l.id, l.qty+1) }, '+')
                );
                const rm = el('button', { class:'btn', onClick:()=> removeLine(l.id) }, 'Remove');
                const line = el('div', { class:'line' });
                line.append(pimg, title, el('div', {}, qty, el('div', { class:'help', style:'text-align:right;margin-top:6px'}, fmt(l.lineTotal)), rm));
                box.append(line);
        });
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

    document.getElementById('quickAdd').addEventListener('click', ()=> addToCart('tee-black'));
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