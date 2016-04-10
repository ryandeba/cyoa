from django.shortcuts import render
from django.http import HttpResponse

import json

def index(request):
    return render(request, 'cyoa/index.html')

def createAdventure(request): #create new adventure, set the user as the host
    if request.user.is_authenticated() == False:
        return HttpResponse(status_code = 401)
    responseData = []
    return HttpResponse(json.dumps(responseData), content_type="application/json")

def joinAdventure(request): #add request.user to the adventure
    if request.user.is_authenticated() == False:
        return HttpResponse(status_code = 401)
    responseData = []
    return HttpResponse(json.dumps(responseData), content_type="application/json")

def loadAdventure(request): #load adventure data for the adventure that the user is in (if applicable)
    if request.user.is_authenticated() == False:
        return HttpResponse(status_code = 401)
    responseData = {
        "name": "adventure name",
        "users": {},
        "activities": [
            { #previously selected activity
                "name": "activity name",
                "url": "url",
                "maps_url": "maps_url",
                "facebook_url": "facebook_url",
            },
            [ #current activity to vote on
                {
                    "name": "activity 1",
                    "votes": 0,
                },
                {
                    "name": "activity 2",
                    "votes": 1,
                },
                {
                    "name": "activity 3",
                    "votes": 2,
                },
            ],
        ],
    }
    return HttpResponse(json.dumps(responseData), content_type="application/json")

def startNextActivity(request): #(HOST) pass the location and activity type selections, create activityAdventures
    if request.user.is_authenticated() == False:
        return HttpResponse(status_code = 401)
    responseData = []
    return HttpResponse(json.dumps(responseData), content_type="application/json")

def endAdventure(request): #(HOST) set date_finished on the adventure
    if request.user.is_authenticated() == False:
        return HttpResponse(status_code = 401)
    responseData = []
    return HttpResponse(json.dumps(responseData), content_type="application/json")

def voteActivity(request):
    if request.user.is_authenticated() == False:
        return HttpResponse(status_code = 401)
    responseData = []
    return HttpResponse(json.dumps(responseData), content_type="application/json")

def loadFinishedAdventures(request):
    if request.user.is_authenticated() == False:
        return HttpResponse(status_code = 401)
    responseData = []
    return HttpResponse(json.dumps(responseData), content_type="application/json")
