from django.conf.urls import url

from . import views

urlpatterns = [
    url(r'^api/(?P<method>\w+)/', views.api),
    url(r'^$', views.index, name='index'),
]
