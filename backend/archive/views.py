from rest_framework import viewsets
from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.conf import settings

from .models import Artist, City, EditorialArticle, FashionCategory, Venue
from .serializers import (
    ArtistSerializer,
    CitySerializer,
    EditorialArticleSerializer,
    FashionCategorySerializer,
    VenueSerializer,
)


class ArtistViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Artist.objects.all()
    serializer_class = ArtistSerializer
    lookup_field = "slug"


class CityViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = City.objects.all()
    serializer_class = CitySerializer
    lookup_field = "slug"


class VenueViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Venue.objects.select_related("city").all()
    serializer_class = VenueSerializer
    lookup_field = "slug"


class FashionCategoryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = FashionCategory.objects.all()
    serializer_class = FashionCategorySerializer
    lookup_field = "slug"


class EditorialArticleViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = EditorialArticle.objects.all()
    serializer_class = EditorialArticleSerializer
    lookup_field = "slug"


@api_view(["GET"])
def search(request):
    """Proxy search to Meilisearch when configured."""
    q = request.query_params.get("q", "")
    if not q:
        return Response({"hits": [], "query": ""})

    try:
        import meilisearch

        client = meilisearch.Client(settings.MEILISEARCH_URL, settings.MEILISEARCH_KEY or None)
        index = client.index("artists")
        results = index.search(q, {"limit": 20})
        return Response(results)
    except Exception:
        # Fallback to database search
        artists = Artist.objects.filter(name__icontains=q)[:20]
        return Response({
            "hits": ArtistSerializer(artists, many=True).data,
            "query": q,
        })
