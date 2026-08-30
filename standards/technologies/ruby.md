# Ruby

> Technology standard for "Ruby Developer" agents. Sources: Ruby style guide, Rails doctrine.

## Language

- Ruby 3.x; RuboCop (default config); frozen string literals
- Idiomatic blocks/enumerators over manual loops; small methods
- Explicit keyword args at public boundaries

## Structure

- Bundler + gemspec; layered by feature
- Constructor injection; service objects for business logic

## Framework

- Rails (or Sinatra for micro); migrations + seeds as code
- Background jobs (Sidekiq) for async work

## Testing

- RSpec (or Minitest); factories over fixtures
- Capybara for feature tests; Testcontainers for real services

## CI/CD

- `bundle exec rubocop && rspec`; slim images; asset pipeline checks
