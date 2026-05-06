import os
from kubernetes import client, config

NAMESPACE = os.getenv('SPARK_NAMESPACE', 'spark')
INGRESS_CLASS = 'nginx'
TLS_SECRET = 'driver-wildcard-tls'
DOMAIN_SUFFIX = '.driver.codelabuk.dev'

"""Get all driver pods in namespace"""
def get_driver_pods():
    try:
        config.load_incluster_config()
    except:
        config.load_kube_config()

    v1 = client.CoreV1Api()
    pods = v1.list_namespaced_pod(
        namespace=NAMESPACE,
        label_selector='spark-role=driver'
    )
    return [pod for pod in pods.items if pod.status.phase in ('Running', 'Pending')]

    """Get all driver-ui ingresses"""
def get_existing_ingresses():
    networking_v1 = client.NetworkingV1Api()
    ingresses = networking_v1.list_namespaced_ingress(
        namespace=NAMESPACE,
        label_selector='app=spark-driver-ui'
    )
    return {ing.metadata.name: ing for ing in ingresses.items}

    """Create Service for driver pod"""
def create_driver_service(pod_name, pod_labels):
    v1 = client.CoreV1Api()

    # Extract app name from pod labels
    app_selector = pod_labels.get('spark-app-selector') or pod_name.rsplit('-driver', 1)[0]

    service = client.V1Service(
        api_version='v1',
        kind='Service',
        metadata=client.V1ObjectMeta(
            name=pod_name,
            namespace=NAMESPACE,
            labels={'app': 'spark-driver-ui', 'driver-pod': pod_name}
        ),
        spec=client.V1ServiceSpec(
            selector={'spark-role': 'driver', 'spark-app-selector': app_selector},
            ports=[client.V1ServicePort(port=4040, target_port=4040, name='ui')],
            type='ClusterIP'
        )
    )

    try:
        v1.create_namespaced_service(namespace=NAMESPACE, body=service)
        print(f" Created Service {pod_name}")
        return True
    except client.exceptions.ApiException as e:
        if e.status == 409:
            return True  # Already exists
        else:
            print(f" Error creating Service: {e}")
            return False

    """Create Ingress for a driver pod"""
def create_driver_ingress(pod_name):
    networking_v1 = client.NetworkingV1Api()

    ingress_name = f"{pod_name}-ui"
    hostname = f"{pod_name}{DOMAIN_SUFFIX}"

    ingress = client.V1Ingress(
        api_version="networking.k8s.io/v1",
        kind="Ingress",
        metadata=client.V1ObjectMeta(
            name=ingress_name,
            namespace=NAMESPACE,
            labels={'app': 'spark-driver-ui', 'driver-pod': pod_name}
        ),
        spec=client.V1IngressSpec(
            ingress_class_name=INGRESS_CLASS,
            tls=[client.V1IngressTLS(hosts=[hostname], secret_name=TLS_SECRET)],
            rules=[client.V1IngressRule(
                host=hostname,
                http=client.V1HTTPIngressRuleValue(
                    paths=[client.V1HTTPIngressPath(
                        path='/',
                        path_type='Prefix',
                        backend=client.V1IngressBackend(
                            service=client.V1IngressServiceBackend(
                                name=pod_name,
                                port=client.V1ServiceBackendPort(number=4040)
                            )
                        )
                    )]
                )
            )]
        )
    )

    try:
        networking_v1.create_namespaced_ingress(namespace=NAMESPACE, body=ingress)
        print(f"Created Ingress for {pod_name} at https://{hostname}")
    except client.exceptions.ApiException as e:
        if e.status != 409:
            print(f"Error creating Ingress: {e}")


def cleanup_stale_resources(active_pods, existing_ingresses):
    """Delete Ingresses for pods that no longer exist"""
    networking_v1 = client.NetworkingV1Api()
    v1 = client.CoreV1Api()
    active_pod_names = {pod.metadata.name for pod in active_pods}

    for ingress_name, ingress in existing_ingresses.items():
        driver_pod = ingress.metadata.labels.get('driver-pod')
        if driver_pod and driver_pod not in active_pod_names:
            try:
                networking_v1.delete_namespaced_ingress(name=ingress_name, namespace=NAMESPACE)
                print(f"Deleted stale Ingress {ingress_name}")
            except Exception as e:
                print(f"Error deleting Ingress: {e}")

            # Also delete the Service
            try:
                v1.delete_namespaced_service(name=driver_pod, namespace=NAMESPACE)
                print(f"✓ Deleted stale Service {driver_pod}")
            except Exception as e:
                pass


def main():
    """Main reconciliation loop"""
    print("=== Spark Driver Ingress Controller ===")

    driver_pods = get_driver_pods()
    existing_ingresses = get_existing_ingresses()

    print(f"Found {len(driver_pods)} driver pods")

    for pod in driver_pods:
        pod_name = pod.metadata.name
        pod_labels = pod.metadata.labels or {}

        if create_driver_service(pod_name, pod_labels):
            create_driver_ingress(pod_name)

    cleanup_stale_resources(driver_pods, existing_ingresses)
    print("=== Done ===")


if __name__ == '__main__':
    main()