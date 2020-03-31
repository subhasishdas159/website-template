<script>
	import Router from 'svelte-spa-router'
	import Home from './pages/home.svelte'
	import About from './pages/about.svelte'
	import Booking from './pages/booking.svelte'
	import Contact from './pages/contact.svelte'
	import Faq from './pages/faq.svelte'
	import NotFound from './pages/notFound.svelte'
	import Nav from './comps/nav.svelte'	
	import Footer from './comps/footer.svelte'	

	let burgerActive = false
	let scrollY = 0
	const routes = {
		'/': Home,
		'/home': Home,
		'/about': About,
		'/booking': Booking,
		'/contact': Contact,
		'/faq': Faq,
		'*': NotFound
	}

navigator.serviceWorker.ready.then(function(registration) {
  registration.showNotification('Vibration Sample', {
    body: 'Buzz! Buzz!',
    icon: '/assets/park.png',
    vibrate: [200, 100, 200, 100, 200, 100, 200],
    tag: '/#/about'
  });
});

</script>

<svelte:window bind:scrollY={scrollY}/>

<Nav bind:burgerActive={burgerActive} bind:scrollY={scrollY} />

<div on:click={() => {burgerActive = false}}>
	<Router {routes} />
	<Footer />
</div>