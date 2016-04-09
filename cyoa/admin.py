from django.contrib import admin

from .models import Location, ActivityType, Activity, ActivityHours

class ActivityHoursInline(admin.TabularInline):
    model = ActivityHours

class ActivityAdmin(admin.ModelAdmin):
    inlines = [
        ActivityHoursInline,
    ]

admin.site.register(Location)
admin.site.register(ActivityType)
admin.site.register(Activity, ActivityAdmin)
