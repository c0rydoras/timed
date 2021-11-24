"""Tests for the projects endpoint."""
from datetime import timedelta

import pytest
from django.urls import reverse
from rest_framework import status

from timed.employment.factories import UserFactory
from timed.projects.factories import ProjectAssigneeFactory, ProjectFactory
from timed.projects.serializers import ProjectSerializer


def test_project_list_not_archived(internal_employee_client):
    project = ProjectFactory.create(archived=False)
    ProjectFactory.create(archived=True)

    url = reverse("project-list")

    response = internal_employee_client.get(url, data={"archived": 0})
    assert response.status_code == status.HTTP_200_OK

    json = response.json()
    assert len(json["data"]) == 1
    assert json["data"][0]["id"] == str(project.id)


def test_project_list_include(
    internal_employee_client, django_assert_num_queries, project
):
    user = UserFactory.create()
    ProjectAssigneeFactory.create(user=user, project=project, is_reviewer=True)

    url = reverse("project-list")

    with django_assert_num_queries(2):
        response = internal_employee_client.get(
            url,
            data={"include": ",".join(ProjectSerializer.included_serializers.keys())},
        )
    assert response.status_code == status.HTTP_200_OK

    json = response.json()
    assert len(json["data"]) == 1
    assert json["data"][0]["id"] == str(project.id)


def test_project_detail_no_auth(db, client, project):
    url = reverse("project-detail", args=[project.id])

    res = client.get(url)
    assert res.status_code == status.HTTP_401_UNAUTHORIZED


def test_project_detail_no_reports(internal_employee_client, project):
    url = reverse("project-detail", args=[project.id])

    res = internal_employee_client.get(url)

    assert res.status_code == status.HTTP_200_OK
    json = res.json()

    assert json["meta"]["spent-time"] == "00:00:00"
    assert json["meta"]["spent-billable"] == "00:00:00"


def test_project_detail_with_reports(
    internal_employee_client, project, task, report_factory
):
    rep1, rep2, rep3, *_ = report_factory.create_batch(
        10, task=task, duration=timedelta(hours=1)
    )
    rep1.not_billable = True
    rep1.save()
    rep2.review = True
    rep2.save()
    rep3.not_billable = True
    rep3.review = True
    rep3.save()

    url = reverse("project-detail", args=[project.id])

    res = internal_employee_client.get(url)

    assert res.status_code == status.HTTP_200_OK
    json = res.json()

    assert json["meta"]["spent-time"] == "10:00:00"
    assert json["meta"]["spent-billable"] == "07:00:00"


def test_project_create(auth_client):
    url = reverse("project-list")

    response = auth_client.post(url)
    assert response.status_code == status.HTTP_405_METHOD_NOT_ALLOWED


def test_project_update(auth_client, project):
    url = reverse("project-detail", args=[project.id])

    response = auth_client.patch(url)
    assert response.status_code == status.HTTP_405_METHOD_NOT_ALLOWED


def test_project_delete(auth_client, project):
    url = reverse("project-detail", args=[project.id])

    response = auth_client.delete(url)
    assert response.status_code == status.HTTP_405_METHOD_NOT_ALLOWED


@pytest.mark.parametrize("is_assigned, expected", [(True, 1), (False, 0)])
def test_project_list_external_employee(
    external_employee_client, is_assigned, expected
):
    ProjectFactory.create_batch(4)
    project = ProjectFactory.create()
    if is_assigned:
        project.assignees.add(external_employee_client.user)

    url = reverse("project-list")

    response = external_employee_client.get(url)
    assert response.status_code == status.HTTP_200_OK

    json = response.json()
    assert len(json["data"]) == expected


def test_project_filter(internal_employee_client):
    user = internal_employee_client.user
    proj1, proj2, *_ = ProjectFactory.create_batch(4)
    ProjectAssigneeFactory.create(project=proj1, user=user, is_reviewer=True)
    ProjectAssigneeFactory.create(project=proj1, user=user, is_manager=True)

    url = reverse("project-list")

    response = internal_employee_client.get(url, data={"has_manager": user.id})
    assert response.status_code == status.HTTP_200_OK

    json = response.json()
    assert len(json["data"]) == 1

    response = internal_employee_client.get(url, data={"has_reviewer": user.id})
    assert response.status_code == status.HTTP_200_OK

    json = response.json()
    assert len(json["data"]) == 1


def test_project_update_billed_flag(internal_employee_client, report_factory):
    report = report_factory.create()
    project = report.task.project
    assert not report.billed

    project.billed = True
    project.save()

    report.refresh_from_db()
    assert report.billed

    project.billed = False
    project.save()

    report.refresh_from_db()
    assert not report.billed


@pytest.mark.parametrize(
    "is_assigned, expected, status_code",
    [(True, 1, status.HTTP_200_OK), (False, 0, status.HTTP_403_FORBIDDEN)],
)
def test_project_list_user_assignee_no_employment(
    auth_client, is_assigned, expected, status_code
):
    ProjectFactory.create_batch(4)
    project = ProjectFactory.create()
    if is_assigned:
        project.customer.assignees.add(auth_client.user)

    url = reverse("project-list")

    response = auth_client.get(url)
    assert response.status_code == status_code

    if expected:
        json = response.json()
        assert len(json["data"]) == expected
