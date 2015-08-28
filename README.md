Overview

socialGov is a Web and mobile apps for social governance. This application is hybrid mobile application built using Apache Cordova and Ionic framework. Please use below instruction to get started to contribute to the application.

Getting started

Install node.js & npm downloading appropriate packages
https://nodejs.org/download/

Install Apache cordova
$npm install -g cordova

Install Ionic framework
$npm install -g ionic

Sign up for user account @ github.com and then fork https://github.com/sureshpragada/socialgov

Install your favorite github client. If you don’t have preference, install Github desktop 
https://desktop.github.com

Clone your forked repo to your local
$git clone https://github.com/<yourusername>/socialgov.git

Start your app
$ionic serve

Access the application @ http://localhost:8100/#/tab/dash

Resources

https://github.com/sureshpragada/socialgov [ Main repo]
https://nodejs.org/download/ [Node JS]
http://ionicframework.com/docs/guide/installation.html [Ionic framework installation]
https://desktop.github.com [Github desktop, client for github]
https://www.parse.com/docs/js/guide#getting-started [Parse JS SDK]

Useful commands

GIT

Go to your socialgov directory and run these commands
git status
git diff <filename>
git add <filename>
git commit -m "Description of your change"
git push origin master

IONIC

ionic start todo blank
ionic platform add android
ionic build android
ionic emulate android
ionic emulate android --livereload 
ionic serve
ionic serve --lab
cordova prepare android
ionic run android
ionic resources --icon
ionic resources --splash
ionic resourcesf

FAQ 

How to submit the changes?
Create a pull request from your fork to socialgov repo


