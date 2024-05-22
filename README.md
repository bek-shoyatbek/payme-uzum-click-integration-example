![Github image](https://myoctocat.com/assets/images/base-octocat.svg)

## Kerakli npm larni o'rnatish

```bash
$ npm install
```

## Loyihani ishlatish

### Loyiha uchun kerak bo'ladigan kalitlarni qo'shish

```bash
# .env.example file nomini .env ga o'zgartiring
$ mv .env.example .env


# .env filedagi kalitlarni o'zingizniki bilan o'zgartiring
$ nano .env

```

> [!NOTE]
> Tepadagi buyruqlar odatda Linux OS uchun siz ketmaketliklarni sichqoncha orqali bajarsangiz ham bo'ladi

### Ma'lumotlar ombori bilan sinxronlash (Prisma va Mongodb)

```bash
# prisma schemalarni db ga ko'shirish
$ npx prisma db push

# prisma schemalarni serverda foydalanish
$ npx prisma generate

```

### Nest serverni yoqish

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

# Payment tizimlari bilan ishlash uchun misol

> [!NOTE]
> Kod da va logikada hato va kamchiliklar bo'lishi mumkun, zero hatosiz kod bu yozilmagan yoki o'chirib tashlagan koddir.

> [!TIP]
> Uzum , Payme , Click merchant API lari Node.js Nest.js frameworki va Prisma ORM database management uchun ishlatilindi.

> [!WARNING]
> To'lov tizimlari uchun ikkita parametr ishlatilindi. Bular planId va userId (user_id)

> [!IMPORTANT]
> To'lov tizimlari bilan integratsiya qilinyotganda beriladigan maxfiy kalitlarni hechkimga bermang va havfsiz joyda saqlang !

## Uzum

> Bu misolda [Merchant API docs](https://developer.uzumbank.uz/merchant/)

### Maxfiy kalitlar

> [!NOTE]
> Odatda siz tarafdan ushbu maxfiy kalitlar beriladi:

```bash
UZUM_USERNAME
UZUM_PASSWORD
```

```bash
UZUM_SERVICE_ID # UZUM tarafdan beriladi
```

> [Uzum uchun qilingan API docs](https://documenter.getpostman.com/view/34214552/2sA3JFAPUT)

## Payme merchant API

> Payme docs [Payme merchant API docs](https://developer.help.paycom.uz/metody-merchant-api/)

### Maxfiy kalitlar

Payme , they are provided by payme

```bash
PAYME_LOGIN=Paycom
PAYME_PASSWORD=sdfsdfsf@@sfdsfdsfdf
PAYME_PASSWORD_TEST=dfdfdf@fddfdf&dfdfdd # test
```

> [!IMPORTANT]
> Payme uchun qurgan API larinigizni oldin test qilishingingiz kerak bo'ladi. [Bu yerda](https://test.paycom.uz/instruction)

## Click

> [!NOTE]
> Bu misolda [Click Shop-api dan foydalanildi](https://docs.click.uz/en/click-api-request/)

they are all provided by Click

```bash
# Click-up credentials by Click
CLICK_SERVICE_ID=33333
CLICK_MERCHANT_ID=333
CLICK_SECRET=33333
CLICK_MERCHANT_USER_ID=3333
```

## Contributing

Agar biron hato yoki refactor qilmoqchi bo'lsangiz pull request ochsangiz hursand bo'laman...
