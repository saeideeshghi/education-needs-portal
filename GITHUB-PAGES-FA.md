# انتشار روی GitHub Pages

منبع انتشار این پروژه پوشهٔ docs روی شاخهٔ main است.

## فعال‌سازی اولیه
در GitHub از Settings → Pages این موارد را انتخاب کنید:
- Source: Deploy from a branch
- Branch: main
- Folder: /docs
سپس Save را بزنید و نتیجهٔ انتشار را در Actions بررسی کنید.

## به‌روزرسانی نسخهٔ نمایشی
بعد از تغییر سورس و اجرای npm run build، خروجی dist را در docs کپی کنید.
فایل docs/.nojekyll را نگه دارید. سپس تغییرات را commit و push کنید.

این نسخه صرفاً دمو فرانت‌اند است و داده‌ها را در مرورگر ذخیره می‌کند.
