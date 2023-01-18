build:
	docker build -t alekstar79/nightlight .
push:
	docker push alekstar79/nightlight
pull:
	docker pull alekstar79/nightlight
run:
	docker run -d -p 80:80 -e DOCKER_ENV=true --rm --name nightlight alekstar79/nightlight
stop:
	docker stop nightlight
