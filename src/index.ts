import {readdirSync, statSync} from "node:fs";
import {resolve, join, extname, basename} from "node:path";
import {pathToFileURL} from "node:url";
import {Plugin} from "vite";

interface TranslationContent {
    [key: string]: string;
}

interface LocaleTranslations {
    [locale: string]: TranslationContent;
}

export default function viteI18nPlugin(projectRoot: string): Plugin {
    let translations: LocaleTranslations = {};

    async function loadTranslations() {
        const srcDir = resolve(projectRoot, "src");
        translations = {}; // Очищаем предыдущие переводы

        function traverseDir(dir: string) {
            const entries = readdirSync(dir);

            entries.forEach(entry => {
                const fullPath = join(dir, entry);
                const stat = statSync(fullPath);

                if (stat.isDirectory()) {
                    if (entry.endsWith(".i18n")) {
                        loadI18nFiles(fullPath);
                    } else {
                        traverseDir(fullPath);
                    }
                }
            });
        }

        function loadI18nFiles(dirPath: string) {
            const files = readdirSync(dirPath).filter(file => extname(file) === ".js");

            files.forEach((file) => {
                const locale = basename(file, extname(file));
                const filePath = resolve(join(dirPath, file));

                try {
                    const fileUrl = pathToFileURL(filePath).href;
                    import(fileUrl).then(module => {
                        const content = module.default;
                        processTranslationContent(content, locale);
                    });
                } catch (error) {
                    console.error(`Error loading translation file ${filePath}:`, error);
                }
            });
        }

        function processTranslationContent(content: Record<string, Record<string, string>>, locale: string) {
            Object.entries(content).forEach(([namespace, keys]) => {
                Object.entries(keys).forEach(([key, value]) => {
                    const fullKey = `${namespace}.${key}`;
                    if (!translations[locale]) {
                        translations[locale] = {};
                    }
                    translations[locale][fullKey] = value;
                });
            });
        }

        traverseDir(srcDir);
    }

    return {
        name: "vite-plugin-i18n",

        // Инициализируем переводы при запуске плагина
        async buildStart() {
            await loadTranslations();
        },

        configureServer(server) {
            // Для dev-сервера загружаем переводы при старте
            loadTranslations();

            // Добавляем горячую перезагрузку для файлов переводов
            server.watcher.add(resolve(projectRoot, "src/**/*.i18n/*.js"));
            server.watcher.on("change", async (path) => {
                if (path.includes(".i18n") && path.endsWith(".js")) {
                    console.log("Translation file changed, reloading...");
                    await loadTranslations();
                    server.ws.send({type: "full-reload"});
                }
            });
        },

        async generateBundle() {
            // Убеждаемся, что переводы загружены перед генерацией бандла
            if (Object.keys(translations).length === 0) {
                await loadTranslations();
            }
        },

        transformIndexHtml(html) {
            const script = `
        <script>
          window.translations = ${JSON.stringify(translations)};
        </script>
      `;

            return html.replace(
                /<\/body>/,
                `${script}</body>`,
            );
        },
    };
}