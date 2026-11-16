# Imagem usada pela Railway (ela detecta este Dockerfile automaticamente)
FROM php:8.3-apache

# Extensão GD: redimensiona e otimiza as imagens enviadas pelo painel
RUN apt-get update \
 && apt-get install -y --no-install-recommends libpng-dev libjpeg62-turbo-dev libwebp-dev \
 && docker-php-ext-configure gd --with-jpeg --with-webp \
 && docker-php-ext-install gd \
 && rm -rf /var/lib/apt/lists/* \
 && a2enmod headers expires

COPY docker/apache.conf /etc/apache2/sites-available/000-default.conf
COPY docker/php.ini /usr/local/etc/php/conf.d/gazeta.ini
COPY docker/entrypoint.sh /usr/local/bin/gazeta-entrypoint
RUN chmod +x /usr/local/bin/gazeta-entrypoint

COPY --chown=www-data:www-data . /var/www/html/

# Pasta persistente (monte o Volume da Railway em /data)
ENV STORAGE_DIR=/data
EXPOSE 8080
ENTRYPOINT ["gazeta-entrypoint"]
