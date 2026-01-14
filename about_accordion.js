// みんなのWAとは - アコーディオン機能
document.addEventListener('DOMContentLoaded', function() {
    // アコーディオンアイテムの取得
    const accordionItems = document.querySelectorAll('.about-accordion-item');

    accordionItems.forEach(item => {
        const header = item.querySelector('.about-accordion-header');
        const content = item.querySelector('.about-accordion-content');
        const icon = header.querySelector('i');

        // ヘッダークリックイベント
        header.addEventListener('click', function() {
            const isActive = item.classList.contains('active');

            // 他のアコーディオンを閉じる
            accordionItems.forEach(otherItem => {
                if (otherItem !== item && otherItem.classList.contains('active')) {
                    otherItem.classList.remove('active');
                    const otherContent = otherItem.querySelector('.about-accordion-content');
                    const otherIcon = otherItem.querySelector('.about-accordion-header i');
                    otherContent.style.maxHeight = null;
                    otherIcon.style.transform = 'rotate(0deg)';
                }
            });

            // 現在のアコーディオンをトグル
            if (isActive) {
                item.classList.remove('active');
                content.style.maxHeight = null;
                icon.style.transform = 'rotate(0deg)';
            } else {
                item.classList.add('active');
                content.style.maxHeight = content.scrollHeight + 'px';
                icon.style.transform = 'rotate(180deg)';
            }
        });
    });

    // 最初のアコーディオンを開く
    if (accordionItems.length > 0) {
        const firstItem = accordionItems[0];
        const firstContent = firstItem.querySelector('.about-accordion-content');
        const firstIcon = firstItem.querySelector('.about-accordion-header i');
        
        firstItem.classList.add('active');
        firstContent.style.maxHeight = firstContent.scrollHeight + 'px';
        firstIcon.style.transform = 'rotate(180deg)';
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

    accordionItems.forEach(item => {
        item.style.opacity = '0';
        item.style.transform = 'translateY(20px)';
        item.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(item);
    });
});
