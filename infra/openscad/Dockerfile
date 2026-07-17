FROM python:3.12-slim

RUN apt-get update \
    && apt-get install --no-install-recommends -y openscad \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /service
COPY server.py /service/server.py
EXPOSE 8080
CMD ["python", "/service/server.py"]
