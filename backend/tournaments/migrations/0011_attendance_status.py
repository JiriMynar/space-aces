"""Docházka: binární present -> třístavový status (byl / online-nepřidal se / nebyl).

Ruční migrace, aby se stávající záznamy převedly a nezahodily:
present=True -> "present", present=False -> "absent".
"""

from django.db import migrations, models


def present_to_status(apps, schema_editor):
    Attendance = apps.get_model("tournaments", "Attendance")
    Attendance.objects.filter(present=True).update(status="present")
    Attendance.objects.filter(present=False).update(status="absent")


def status_to_present(apps, schema_editor):
    Attendance = apps.get_model("tournaments", "Attendance")
    # Zpět jen binárně — "ignored" spadne do "nebyl".
    Attendance.objects.filter(status="present").update(present=True)
    Attendance.objects.exclude(status="present").update(present=False)


class Migration(migrations.Migration):

    dependencies = [
        ("tournaments", "0010_event_attendance"),
    ]

    operations = [
        migrations.AddField(
            model_name="attendance",
            name="status",
            field=models.CharField(
                choices=[
                    ("present", "Byl"),
                    ("ignored", "Byl online, ale nepřidal se"),
                    ("absent", "Nebyl"),
                ],
                default="absent",
                max_length=8,
            ),
        ),
        migrations.RunPython(present_to_status, status_to_present),
        migrations.RemoveField(
            model_name="attendance",
            name="present",
        ),
    ]
