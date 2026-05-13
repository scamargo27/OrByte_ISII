from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.permissions import IsAuthenticated, AllowAny

from .serializers import LoginSerializer
from .models import Usuario
from pedidos.permissions import EsAdminOTrabajador


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if serializer.is_valid():
            user  = serializer.validated_data['user']
            token, _ = Token.objects.get_or_create(user=user)
            return Response({
                'token': token.key,
                'usuario': {
                    'id':     user.id,
                    'nombre': user.nombre,
                    'email':  user.email,
                    'rol':    user.rol.nombre if user.rol else None,
                }
            }, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        request.user.auth_token.delete()
        return Response({'mensaje': 'Sesión cerrada correctamente.'}, status=status.HTTP_200_OK)


class BuscarClienteView(APIView):
    permission_classes = [EsAdminOTrabajador]

    def get(self, request):
        q = request.query_params.get('q', '').strip()
        if not q:
            return Response({'error': 'Proporciona cédula, correo o teléfono para buscar.'}, status=status.HTTP_400_BAD_REQUEST)

        from django.db.models import Q
        try:
            cliente = (
                Usuario.objects
                .select_related('rol')
                .get(Q(cedula=q) | Q(email__iexact=q) | Q(telefono=q), activo=True)
            )
        except Usuario.DoesNotExist:
            return Response({'error': 'No se encontró un cliente activo con ese dato.'}, status=status.HTTP_404_NOT_FOUND)
        except Usuario.MultipleObjectsReturned:
            return Response({'error': 'Se encontraron varios registros. Intenta con la cédula.'}, status=status.HTTP_400_BAD_REQUEST)

        if cliente.rol.nombre != 'cliente':
            return Response({'error': 'El usuario encontrado no tiene rol de cliente.'}, status=status.HTTP_400_BAD_REQUEST)

        return Response({
            'id':       cliente.id,
            'nombre':   cliente.nombre,
            'email':    cliente.email,
            'cedula':   cliente.cedula,
            'telefono': cliente.telefono,
        })