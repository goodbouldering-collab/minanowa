// みんなのWAとは - アコーディオン機能

// アコーディオンのトグル関数（グローバルスコープ）
function toggleAccordion(button) {
    const accordionItem = button.parentElement;
    const accordionContent = accordionItem.querySelector('.accordion-content');
    const arrow = button.querySelector('.accordion-arrow');
    
    // 現在のアイテムがアクティブかどうか
    const isActive = accordionItem.classList.contains('active');
    
    // 他の全てのアコーディオンを閉じる
    document.querySelectorAll('.accordion-item').forEach(item => {
        if (item !== accordionItem) {
            item.classList.remove('active');
            const content = item.querySelector('.accordion-content');
            const itemArrow = item.querySelector('.accordion-arrow');
            if (content) content.style.maxHeight = null;
            if (itemArrow) itemArrow.style.transform = 'rotate(0deg)';
        }
    });
    
    // 現在のアイテムをトグル
    if (isActive) {
        accordionItem.classList.remove('active');
        accordionContent.style.maxHeight = null;
        if (arrow) arrow.style.transform = 'rotate(0deg)';
    } else {
        accordionItem.classList.add('active');
        accordionContent.style.maxHeight = accordionContent.scrollHeight + 'px';
        if (arrow) arrow.style.transform = 'rotate(180deg)';
    }
}

// DOMContentLoaded後の初期化
document.addEventListener('DOMContentLoaded', function() {
    // 最初のアコーディオンを開く
    const firstItem = document.querySelector('.accordion-item');
    if (firstItem) {
        firstItem.classList.add('active');
        const firstContent = firstItem.querySelector('.accordion-content');
        const firstArrow = firstItem.querySelector('.accordion-arrow');
        
        if (firstContent) {
            firstContent.style.maxHeight = firstContent.scrollHeight + 'px';
        }
        if (firstArrow) {
            firstArrow.style.transform = 'rotate(180deg)';
        }
    }
    
    // スクロールアニメーション
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, { threshold: 0.1 });
    
    const accordionItems = document.querySelectorAll('.accordion-item');
    accordionItems.forEach((item, index) => {
        item.style.opacity = '0';
        item.style.transform = 'translateY(20px)';
        item.style.transition = `opacity 0.6s ease ${index * 0.1}s, transform 0.6s ease ${index * 0.1}s`;
        observer.observe(item);
    });
    
    // 統計データのカウントアップアニメーション
    const statCards = document.querySelectorAll('.stat-card');
    const statObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const statNumber = entry.target.querySelector('.stat-number');
                if (statNumber && !statNumber.dataset.animated) {
                    const target = parseInt(statNumber.textContent);
                    let current = 0;
                    const increment = target / 50;
                    const timer = setInterval(() => {
                        current += increment;
                        if (current >= target) {
                            statNumber.textContent = target + '%';
                            clearInterval(timer);
                        } else {
                            statNumber.textContent = Math.floor(current) + '%';
                        }
                    }, 30);
                    statNumber.dataset.animated = 'true';
                }
            }
        });
    }, { threshold: 0.5 });
    
    statCards.forEach(card => {
        statObserver.observe(card);
    });
});
