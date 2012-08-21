test:
	@./node_modules/.bin/mocha \
		--reporter spec \
		test/*

.PHONY: test
