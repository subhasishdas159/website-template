<script>
  import { location } from 'svelte-spa-router'
  export let burgerActive
  export let scrollY
</script>
<nav class="navbar is-fixed-top" class:has-shadow={scrollY > 0} role="navigation" aria-label="main navigation">
  <div class="container is-flex-desktop">
    <div class="navbar-brand">
      <a class="navbar-item" href="#/">
        <img src="https://bulma.io/images/bulma-logo.png" alt="brand pic" width="112" height="28">
      </a>
      <span class:is-active={burgerActive} role="button" class="navbar-burger" aria-label="menu" aria-expanded="false" on:click={() =>{burgerActive = !burgerActive}}>
        <span aria-hidden="true"></span>
        <span aria-hidden="true"></span>
        <span aria-hidden="true"></span>
      </span>
    </div>
    <div class="navbar-menu" class:is-active={burgerActive} on:click={()=>{burgerActive = false}}>
      <div class="navbar-end">
          <a href="#/" class="navbar-item" class:navActive={$location == "/home" || $location == "/"}>Home</a>
          <a href="#/about" class="navbar-item" class:navActive={$location == "/about"}>About</a>
          <a href="#/booking" class="navbar-item" class:navActive={$location == "/booking"}>Booking</a>
          <a href="#/contact" class="navbar-item" class:navActive={$location == "/contact"}>Contact</a>
          <a href="#/faq" class="navbar-item" class:navActive={$location == "/faq"}>FAQ</a>
      </div>
    </div>
  </div>
</nav>

<style>
  .navActive {
    color: blue;
    font-weight: 600;
  }
  .navbar {
    max-height: 3rem;
    min-height: 3rem;
  }
  .navbar-item:active {
    color: blue;
    background: white;
    font-weight: 600;
  }
  .navbar-item:hover {
    color: blue;
  }
  .navbar-item:focus {
    color: blue;
    background: white;
  }
  .navbar-burger {
    -webkit-tap-highlight-color: transparent;
    height: 3rem;
    width: 3rem;
  }
  .navbar-burger:hover {
    background: white;
  }
  .navbar-burger span {
    left: calc(50% - 12px);
    height: 2px;
    width: 25px;
    transition-duration: 150ms;
    transition-timing-function: ease-in-out;
  }
  .navbar-menu .is-active {
    overflow-y: auto;
    -webkit-overflow-y: auto;
    -moz-overflow-y: auto;
    -o-overflow-y: auto;
    -ms-overflow-y: auto;
  }
  .navbar-brand, .navbar-tabs {
    min-width: 3rem;
  }
</style>