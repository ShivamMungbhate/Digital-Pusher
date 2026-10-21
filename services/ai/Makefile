.PHONY: install run test eval lint

install:
	pip install -r requirements.txt

run:
	uvicorn app.main:app --host 0.0.0.0 --port 5001 --reload

test:
	pytest tests/ -v

eval:
	python eval/run_eval.py

lint:
	ruff check .
