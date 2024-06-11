angular.module('miApp', ['ngResource'])
    .controller('miControlador', ['$http', '$scope', function($http, $scope) {
        var vm  = this;

        // Inicializa $scope.apis como un array vacío
        $scope.apis = [];

        // Obtener la lista de servidores desde el endpoint
        $http.get('https://cloud1.provfact.com/facturacion_electronica/api/servers')
            .then(function(response) {
                // Construye dinámicamente el arreglo $scope.apis a partir de la respuesta
                response.data.forEach(function(server) {
                    $scope.apis.push({
                        url: 'https://' + server.server + '/facturacion_electronica/api/test/', // Ajusta el path según corresponda
                        name: server.name,
                        data: [],
                        loading: false
                    });
                });

                // Llama a la función para consultar todas las APIs
                $scope.consultarTodasAPIs();
            })
            .catch(function(error) {
                console.error('Error al obtener los servidores:', error);
            });

        // Probar metodo post
        // Inicializa los datos de la respuesta
        $scope.responseData = {};

        //TOKEN
        // Función para generar el token
        $scope.generateToken = function() {
            // Aquí puedes llamar a tu backend PHP para obtener el token generado previamente
            return $http.get('php/backend.php')
                .then(function(response) {
                    if (response.data && response.data.token) {
                        return response.data.token; // Devuelve el token generado por PHP
                    } else {
                        throw new Error('Token no encontrado en la respuesta');
                    }
                })
                .catch(function(error) {
                    console.error('Error al generar el token:', error);
                });
        };

        // Función para enviar datos
        $scope.sendData = function() {
            $scope.generateToken().then(function(token) {
                // Datos a enviar en la solicitud POST
                var data = {
                    token: token
                };

                console.log(token);
                console.log(data);

                $http.post('https://cloud1.provfact.com/facturacion_electronica/api/get_enterprises_up', data)
                    .then(function(response) {
                        // Manejo de la respuesta exitosa
                        $scope.responseData = response.data;
                        console.log('Respuesta metodo post:', $scope.responseData);
                    }, function(error) {
                        // Manejo de errores
                        console.error('Error:', error);
                    });
            });
        };

        console.log($scope.apis);

        $scope.allData = []; // Lista consolidada de todos los datos

        $scope.buscando = false; // Variable para filtro

        $scope.totalCoincidencias = 0;

        $scope.totalEmpresasActivas = 0;

        $scope.totalEmpresasInactivas = 0;

        // Variables de paginación
        $scope.pageSize = 20; // Número de elementos por página
        $scope.currentPage = 1; // Página actual
        $scope.totalPages = 1; // Número total de páginas

        // Define la función para hacer la solicitud GET a las APIs
        $scope.consultarAPI = function(api) {
            api.loading = true;
            $http.get(api.url)
                .then(function(response) {
                    console.log('Respuesta de', api.name + ':', response.data);
                    var responseData = Array.isArray(response.data) ? response.data : response.data.data;
                    responseData.forEach(d => {
                        d.server = api.name; // Agregar nombre del servidor a cada dato
                        d.url = api.url; // Añadir la URL base a los datos
                        if (d.user === 'admin') {
                            d.user = 'inactivo';
                        }
                    });
                    $scope.allData = $scope.allData.concat(responseData);
                    $scope.calculateTotalPages(); 
                })
                .catch(function(error) {
                    console.error('Error al consultar', api.name, error);
                })
                .finally(function() {
                    api.loading = false;
                });
        };

        // Define la función para consultar todas las APIs - Bucle
        $scope.consultarTodasAPIs = function() {
            $scope.buscando = true; 
            $scope.apis.forEach(api => $scope.consultarAPI(api));
        };

        //METODOS PARA FILTRAR DATOS Y PAGINACION
        // Calcular el número total de páginas
        $scope.calculateTotalPages = function() {
            let filteredData = $scope.filterData();
            $scope.totalPages = Math.ceil(filteredData.length / $scope.pageSize);
        };

        // Cambiar página
        $scope.changePage = function(page) {
            if (page >= 1 && page <= $scope.totalPages) {
                $scope.currentPage = page;
            }
        };

        // Filtrar datos basado en el modelo de búsqueda
        $scope.filterData = function() {
            if (!$scope.filtro || $scope.filtro.trim() === '') {
                $scope.totalCoincidencias = $scope.allData.length;
                $scope.totalEmpresasActivas = $scope.allData.filter(dato => dato.user === 'activo').length;
                $scope.totalEmpresasInactivas = $scope.allData.filter(dato => dato.user === 'inactivo').length;
                return $scope.allData;
            }
            let term = $scope.filtro.toLowerCase();
            let filteredData = $scope.allData.filter(function(dato) {
                return (
                    dato.name.toLowerCase().includes(term) ||
                    dato.ruc.toString().toLowerCase().includes(term) ||
                    dato.user.toLowerCase().startsWith(term) ||
                    dato.server.toLowerCase().includes(term) ||
                    dato.expiration_date.toString().toLowerCase().includes(term)
                );
            });

            // Calcular el total de empresas activas e inactivas según el filtro
            $scope.totalEmpresasActivas = filteredData.filter(dato => dato.user === 'activo').length;
            $scope.totalEmpresasInactivas = filteredData.filter(dato => dato.user === 'inactivo').length;

            return filteredData;
        };


        // Obtener datos paginados
        $scope.getPaginatedData = function() {
            let filteredData = $scope.filterData();
            let start = ($scope.currentPage - 1) * $scope.pageSize;
            let end = start + $scope.pageSize;
            return filteredData.slice(start, end);
        };

        //Visualizar el filtro
        $scope.$watch('filtro', function() {
            $scope.calculateTotalPages();
            $scope.currentPage = 1; // Resetear a la primera página cuando cambia el filtro
            let filteredData = $scope.filterData();
            $scope.totalCoincidencias = filteredData.length;
        });

        // Llama a la función para consultar todas las APIs
        $scope.consultarTodasAPIs();

        //ORDENAMIENTO
        $scope.sortKey = ''; // Inicializa la clave de ordenamiento
        $scope.reverse = false; // Inicializa el estado de ordenamiento como ascendente
        // Variables para rastrear el estado de ordenamiento de cada columna
        $scope.sortStates = {
            id: '',
            name: '',
            ruc: '',
            token: '',
            path:'',
            firma_electronica:'',
            expiration_date:'',
            user:'',
            server:''
        };
        $scope.sortColumn = function(key) {
            // Si la misma columna se ha clicado nuevamente, invertir el estado de ordenamiento
            if ($scope.sortKey === key) {
                $scope.reverse = !$scope.reverse;
            } else {
                // Si se ha clicado en una nueva columna, establecer el estado de ordenamiento como ascendente
                $scope.sortKey = key;
                $scope.reverse = true;
            }

            // Actualiza el estado de ordenamiento de la columna
            $scope.sortStates[key] = $scope.reverse ? 'desc' : 'asc';

            // Restablece el estado de ordenamiento de las otras columnas
            for (var column in $scope.sortStates) {
                if (column !== key) {
                    $scope.sortStates[column] = '';
                }
            }

            // Función de ordenamiento personalizada
            $scope.allData.sort(function(a, b) {
                var x = a[key];
                var y = b[key];
                if ($scope.reverse) {
                    return x.localeCompare(y); // Ordena en orden descendente
                } else {
                    return y.localeCompare(x); // Ordena en orden ascendente
                }
            });
        };
        //Función para verificar si la columna está siendo ordenada
        $scope.isSorting = function(key) {
            return $scope.sortKey === key;
        };

        //ARCHIVO EXCEL
        // Función para exportar la tabla a Excel
        $scope.exportarExcel = function() {
            var datos = [
                ["Servidor", "ID", "Nombre", "RUC", "Direccion", "Ruta", "Path", "Estado de usuario", "Token", "Contribuidor", "Firma electronica", "Expiracion"]
            ];

            // Recorrer todas las APIs y agregar sus datos a la matriz
            angular.forEach($scope.allData, function(dato) {
                datos.push([
                    dato.server,
                    dato.id,
                    dato.name,
                    dato.ruc,
                    dato.address,
                    dato.route,
                    dato.path,
                    dato.user,
                    dato.token,
                    dato.code_contributor,
                    dato.firma_electronica,
                    dato.expiration_date]);
            });

            // Crear una hoja de cálculo a partir de los datos consolidados
            var hojaCalculo = XLSX.utils.aoa_to_sheet(datos);

            // Crear un libro de trabajo y agregar la hoja de cálculo
            var libroTrabajo = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(libroTrabajo, hojaCalculo, 'Registros');

            // Obtener la fecha y hora actual
            var fechaHora = new Date();
            var fechaFormateada = fechaHora.getFullYear() + "-" + (fechaHora.getMonth() + 1) + "-" + fechaHora.getDate();
            var horaFormateada = fechaHora.getHours() + "-" + fechaHora.getMinutes();

            // Nombre del archivo con la fecha y hora
            var nombreArchivo = 'registros_' + fechaFormateada + '_' + horaFormateada + '.xlsx';

            // Guardar el archivo como Excel
            XLSX.writeFile(libroTrabajo, nombreArchivo);
        };

        //URL
        // Navegar a la URL específica
        //Path
        $scope.navegarPath = function(dato) {
            var cloudUrl = $scope.apis.find(api => api.name === dato.server).url;
            var baseUrl = cloudUrl.replace('/api/test/', '/application/data/');
            var fullUrl = baseUrl + dato.path;
            window.open(fullUrl, '_blank'); // Abre la URL en una nueva pestaña
        };

        //Cloud
        $scope.navegarCloud = function(dato) {
            var cloudUrl = $scope.apis.find(api => api.name === dato.server).url;
            var baseUrl = cloudUrl.replace('/api/test/', '/admin/server/dashboard/#/');
            var fullUrl = baseUrl;
            window.open(fullUrl, '_blank'); // Abre la URL en una nueva pestaña
        };

       


    }]);
