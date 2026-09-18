# Usage:
#   make publish              # bump patch (1.0.0 → 1.0.1), then publish
#   make publish BUMP=minor   # 1.0.0 → 1.1.0
#   make publish BUMP=major   # 1.0.0 → 2.0.0
#   make publish-patch|minor|major
#
# Requires a clean git working tree, npm login, and push access.

.PHONY: check build test clean \
	publish publish-patch publish-minor publish-major \
	ensure-clean ensure-main

BUMP ?= patch

check:
	npm run check

build:
	npm run build

test:
	npm test

clean:
	npm run clean

ensure-clean:
	@git rev-parse --is-inside-work-tree >/dev/null 2>&1 || \
		(echo "error: not a git repository" >&2; exit 1)
	@git diff --quiet && git diff --cached --quiet || \
		(echo "error: working tree is dirty; commit or stash first" >&2; exit 1)

ensure-main:
	@branch=$$(git rev-parse --abbrev-ref HEAD); \
	if [ "$$branch" != "main" ] && [ "$$branch" != "master" ]; then \
		echo "error: publish from main/master (on $$branch)" >&2; \
		exit 1; \
	fi

# Bump package.json version, run prepublishOnly (check + build), publish, push tag.
publish: ensure-clean ensure-main
	@case "$(BUMP)" in \
		patch|minor|major) ;; \
		*) echo "error: BUMP must be patch, minor, or major (got '$(BUMP)')" >&2; exit 1 ;; \
	esac
	npm version $(BUMP) -m "chore: release v%s"
	npm publish
	git push && git push --tags
	@echo "Published $$(node -p "require('./package.json').version")"

publish-patch:
	$(MAKE) publish BUMP=patch

publish-minor:
	$(MAKE) publish BUMP=minor

publish-major:
	$(MAKE) publish BUMP=major
