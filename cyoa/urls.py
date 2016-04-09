from django.conf.urls import url

from . import views

urlpatterns = [
    url(r'^api/createAdventure/', views.createAdventure),
    url(r'^api/loadAdventure/', views.loadAdventure),
    url(r'^$', views.index, name='index'),
]
