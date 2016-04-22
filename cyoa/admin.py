from django.contrib import admin

from .models import AppUser, Location, ActivityType, Activity, ActivityHours, Adventure

class ActivityHoursInline(admin.TabularInline):
    model = ActivityHours

class ActivityAdmin(admin.ModelAdmin):
    inlines = [
        ActivityHoursInline,
    ]

admin.site.register(AppUser)
admin.site.register(Location)
admin.site.register(ActivityType)
admin.site.register(Activity, ActivityAdmin)
admin.site.register(Adventure)
