from django.contrib import admin

from .models import AppUser, Location, ActivityType, Activity, ActivityHours, Adventure, AdventureUser, AdventureActivity

class ActivityHoursInline(admin.TabularInline):
    model = ActivityHours

class AdventureUserInline(admin.TabularInline):
    model = AdventureUser

class AdventureActivityInline(admin.TabularInline):
    model = AdventureActivity

class ActivityAdmin(admin.ModelAdmin):
    inlines = [
        ActivityHoursInline,
    ]

class AdventureAdmin(admin.ModelAdmin):
    inlines = [
        AdventureUserInline,
        AdventureActivityInline,
    ]

admin.site.register(AppUser)
admin.site.register(Location)
admin.site.register(ActivityType)
admin.site.register(Activity, ActivityAdmin)
admin.site.register(Adventure, AdventureAdmin)
