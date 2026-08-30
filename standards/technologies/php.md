# PHP

> Technology standard for "PHP Developer" agents. Sources: PSR standards, PHP-FIG.

## Language

- PHP 8.3; strict types (`declare(strict_types=1)`)
- Typed properties/returns; enums over magic strings; no global state
- php-cs-fixer/PHPStan (max level)

## Structure

- Composer + PSR-4 autoloading; layered by feature
- Constructor injection; value objects for domain concepts

## Framework

- Laravel or Symfony; migrations as code; queues for async work

## Testing

- PHPUnit + Pest; fakers/fixtures; feature tests over unit-only
- Testcontainers for real DBs; coverage ≥ 80%

## CI/CD

- `composer install`, phpstan, php-cs-fixer, phpunit; official slim images
