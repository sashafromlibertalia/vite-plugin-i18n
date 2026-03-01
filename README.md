# @builtbysasha/vite-plugin-i18n

Плагин для Vite при работе с интернационализацией в приложениях. 
Рекомендован к использованию с библиотекой [FormatJS](https://formatjs.io/)


## Установка

```shell
pnpm add -D @builtbysasha/vite-plugin-i18n
```

## Пример

```js
// src/component/_.i18n/ru.js

export default {
    "scope": {
        "key-1": "Перевод 1",
        "key-2": "Перевод 2"
    }
}
```